import { execSync, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { parseCommaSeparated, resolveFleetTargets } from './fleet-projects'

interface CliOptions {
  appsDir: string
  concurrency: number
  dryRun: boolean
  skipQuality: boolean
  autoCommit: boolean
  continueOnError: boolean
  allowDirtyApp: boolean
  allowDirtyTemplate: boolean
  fromRepo: string | null
  repos: string[]
  exclude: Set<string>
  templateSha: string
}

function usage(): never {
  console.error('Usage: npx tsx tools/sync-fleet.ts [options]')
  console.error('  --repos=app1,app2        Only sync the listed repos')
  console.error('  --exclude=app1,app2      Skip the listed repos')
  console.error('  --from=<repo>            Start from this repo in the resolved target set')
  console.error('  --apps-dir=<path>        Override local fleet apps directory')
  console.error('  --concurrency=<n>        Number of concurrent syncs (default: 4)')
  console.error('  --jobs=<n>               Alias for --concurrency')
  console.error('  --dry-run                Preview changes without writing files')
  console.error('  --skip-quality           Skip per-app quality checks')
  console.error('  --auto-commit            Commit sync changes locally per repo')
  console.error('  --continue-on-error      Keep syncing after a failure')
  console.error('  --allow-dirty-app        Sync onto dirty app worktrees')
  console.error('  --allow-dirty-template   Sync from an uncommitted template checkout')
  process.exit(1)
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  if (args.includes('--help')) usage()

  const appsDirArg = args.find((arg) => arg.startsWith('--apps-dir='))?.slice('--apps-dir='.length)
  const concurrencyArg =
    args.find((arg) => arg.startsWith('--concurrency='))?.slice('--concurrency='.length) ||
    args.find((arg) => arg.startsWith('--jobs='))?.slice('--jobs='.length) ||
    '4'

  const defaultAppsDir = resolve(
    join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', 'template-apps'),
  )
  const concurrency = Number.parseInt(concurrencyArg, 10)
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    console.error(`Invalid concurrency: ${concurrencyArg}`)
    usage()
  }

  return {
    appsDir: resolve(appsDirArg ?? process.env.FLEET_APPS_DIR ?? defaultAppsDir),
    concurrency,
    dryRun: args.includes('--dry-run'),
    skipQuality: args.includes('--skip-quality'),
    autoCommit: args.includes('--auto-commit'),
    continueOnError: args.includes('--continue-on-error'),
    allowDirtyApp: args.includes('--allow-dirty-app'),
    allowDirtyTemplate: args.includes('--allow-dirty-template'),
    fromRepo: args.find((arg) => arg.startsWith('--from='))?.slice('--from='.length) ?? null,
    repos: parseCommaSeparated(
      args.find((arg) => arg.startsWith('--repos='))?.slice('--repos='.length),
    ),
    exclude: new Set(
      parseCommaSeparated(
        args.find((arg) => arg.startsWith('--exclude='))?.slice('--exclude='.length),
      ),
    ),
    templateSha: (() => {
      try {
        return execSync('git rev-parse --short HEAD', {
          cwd: resolve(join(fileURLToPath(new URL('.', import.meta.url)), '..')),
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        }).trim()
      } catch {
        return 'unknown'
      }
    })(),
  }
}

function prefixStream(
  repoName: string,
  stream: NodeJS.ReadableStream | null,
  writer: typeof console.log,
) {
  if (!stream) return

  const reader = createInterface({ input: stream })
  reader.on('line', (line) => writer(`[${repoName}] ${line}`))
}

function runGitStatus(repoDir: string): Promise<string> {
  return new Promise((resolveStatus) => {
    const child = spawn('git', ['status', '--porcelain'], {
      cwd: repoDir,
      stdio: ['ignore', 'pipe', 'ignore'],
    })

    let output = ''
    child.stdout.on('data', (chunk) => {
      output += chunk.toString()
    })

    child.on('close', () => resolveStatus(output.trim()))
    child.on('error', () => resolveStatus(''))
  })
}

function runSync(repoName: string, repoDir: string, options: CliOptions): Promise<number> {
  if (!existsSync(repoDir)) {
    console.error(`[${repoName}] Missing local clone.`)
    return Promise.resolve(2)
  }

  const args = ['exec', 'tsx', 'tools/sync-template.ts', repoDir]
  if (options.dryRun) args.push('--dry-run')
  if (options.skipQuality) args.push('--skip-quality')
  if (options.allowDirtyApp) args.push('--allow-dirty-app')
  if (options.allowDirtyTemplate) args.push('--allow-dirty-template')

  return new Promise((resolveExitCode) => {
    const child = spawn('pnpm', args, {
      cwd: resolve(join(fileURLToPath(new URL('.', import.meta.url)), '..')),
      env: process.env,
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    prefixStream(repoName, child.stdout, console.log)
    prefixStream(repoName, child.stderr, console.error)

    child.on('error', (error) => {
      console.error(`[${repoName}] Failed to start sync: ${error.message}`)
      resolveExitCode(1)
    })

    child.on('close', async (code, signal) => {
      if (signal) {
        console.error(`[${repoName}] sync exited from signal ${signal}`)
        resolveExitCode(1)
        return
      }

      if ((code ?? 1) !== 0) {
        resolveExitCode(code ?? 1)
        return
      }

      if (!options.autoCommit || options.dryRun) {
        resolveExitCode(0)
        return
      }

      const dirtyStatus = await runGitStatus(repoDir)
      if (!dirtyStatus) {
        console.log(`[${repoName}] No changes to commit.`)
        resolveExitCode(0)
        return
      }

      const commit = spawn('git', ['add', '-A'], {
        cwd: repoDir,
        shell: process.platform === 'win32',
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      prefixStream(repoName, commit.stdout, console.log)
      prefixStream(repoName, commit.stderr, console.error)

      commit.on('close', (addCode) => {
        if ((addCode ?? 1) !== 0) {
          resolveExitCode(addCode ?? 1)
          return
        }

        const message = `chore: sync with template ${options.templateSha}`
        const commitChild = spawn('git', ['commit', '--no-verify', '-m', message], {
          cwd: repoDir,
          shell: process.platform === 'win32',
          stdio: ['ignore', 'pipe', 'pipe'],
        })

        prefixStream(repoName, commitChild.stdout, console.log)
        prefixStream(repoName, commitChild.stderr, console.error)

        commitChild.on('close', (commitCode) => resolveExitCode(commitCode ?? 1))
        commitChild.on('error', () => resolveExitCode(1))
      })
      commit.on('error', () => resolveExitCode(1))
    })
  })
}

async function runTargets(targets: string[], options: CliOptions) {
  const succeeded = new Set<string>()
  const failed = new Set<string>()
  const concurrency = Math.min(options.concurrency, targets.length)
  let nextIndex = 0
  let stopScheduling = false

  async function worker() {
    while (true) {
      if (stopScheduling && !options.continueOnError) return

      const repoName = targets[nextIndex]
      nextIndex += 1
      if (!repoName) return

      const repoDir = join(options.appsDir, repoName)

      if (options.autoCommit && !options.dryRun) {
        const dirtyBefore = await runGitStatus(repoDir)
        if (dirtyBefore) {
          console.error(`[${repoName}] Dirty worktree detected; skipping auto-commit sync.`)
          failed.add(repoName)
          if (!options.continueOnError) {
            stopScheduling = true
          }
          continue
        }
      }

      const exitCode = await runSync(repoName, repoDir, options)
      if (exitCode === 0) {
        succeeded.add(repoName)
        continue
      }

      failed.add(repoName)
      console.error(`[${repoName}] Failed (exit ${exitCode})`)
      if (!options.continueOnError) {
        stopScheduling = true
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))

  return {
    succeeded: targets.filter((repoName) => succeeded.has(repoName)),
    failed: targets.filter((repoName) => failed.has(repoName)),
  }
}

async function main() {
  const options = parseArgs()
  const { repos, source } = await resolveFleetTargets({
    explicit: options.repos,
    envValue: process.env.FLEET_PROJECTS,
    exclude: options.exclude,
    fromRepo: options.fromRepo,
    log: (message) => console.error(message),
  })

  console.log('')
  console.log('Fleet Sync')
  console.log('══════════════════════════════════════════════════════════════')
  console.log(`Apps dir: ${options.appsDir}`)
  console.log(`Targets:  ${repos.join(', ')}`)
  console.log(`Source:   ${source}`)
  console.log(`Parallel: ${Math.min(options.concurrency, repos.length)}`)
  console.log(`SHA:      ${options.templateSha}`)
  if (options.dryRun) console.log('Mode:     dry run')
  if (options.skipQuality) console.log('Quality:  skipped')
  if (options.autoCommit) console.log('Commit:   auto-commit enabled')
  if (options.continueOnError) console.log('Policy:   continue on error')
  console.log('')

  const { succeeded, failed } = await runTargets(repos, options)

  console.log('\n══════════════════════════════════════════════════════════════')
  console.log(`Succeeded: ${succeeded.length}`)
  console.log(`Failed:    ${failed.length}`)
  if (failed.length > 0) {
    console.log(`Failed repos: ${failed.join(', ')}`)
    process.exit(1)
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
})
