import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { parseCommaSeparated, resolveFleetTargets } from './fleet-projects'

interface CliOptions {
  appsDir: string
  concurrency: number
  dryRun: boolean
  continueOnError: boolean
  fromRepo: string | null
  repos: string[]
  exclude: Set<string>
}

function usage(): never {
  console.error('Usage: npx tsx tools/fetch-fleet.ts [options]')
  console.error('  --repos=app1,app2        Only fetch the listed repos')
  console.error('  --exclude=app1,app2      Skip the listed repos')
  console.error('  --from=<repo>            Start from this repo in manifest order')
  console.error('  --apps-dir=<path>        Override local fleet apps directory')
  console.error('  --concurrency=<n>        Number of concurrent git fetches (default: 8)')
  console.error('  --dry-run                Print planned commands without fetching')
  console.error('  --continue-on-error      Keep fetching after a failure')
  process.exit(1)
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const appsDirArg = args.find((arg) => arg.startsWith('--apps-dir='))?.slice('--apps-dir='.length)
  const concurrencyArg = args
    .find((arg) => arg.startsWith('--concurrency='))
    ?.slice('--concurrency='.length)
  const fromRepo = args.find((arg) => arg.startsWith('--from='))?.slice('--from='.length) ?? null
  const defaultAppsDir = resolve(
    join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', 'template-apps'),
  )
  const concurrency = Number.parseInt(concurrencyArg ?? '8', 10)

  if (!Number.isInteger(concurrency) || concurrency < 1) {
    console.error(`Invalid concurrency: ${concurrencyArg ?? ''}`)
    usage()
  }

  return {
    appsDir: resolve(appsDirArg ?? process.env.FLEET_APPS_DIR ?? defaultAppsDir),
    concurrency,
    dryRun: args.includes('--dry-run'),
    continueOnError: args.includes('--continue-on-error'),
    fromRepo,
    repos: parseCommaSeparated(
      args.find((arg) => arg.startsWith('--repos='))?.slice('--repos='.length),
    ),
    exclude: new Set(
      parseCommaSeparated(
        args.find((arg) => arg.startsWith('--exclude='))?.slice('--exclude='.length),
      ),
    ),
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

function runFetch(repoName: string, repoDir: string, dryRun: boolean): Promise<number> {
  if (!existsSync(repoDir)) {
    console.error(`[${repoName}] Missing local clone — skipped.`)
    return Promise.resolve(2)
  }

  if (!existsSync(join(repoDir, '.git'))) {
    console.error(`[${repoName}] Not a git repo — skipped.`)
    return Promise.resolve(2)
  }

  if (dryRun) {
    console.log(`[${repoName}] DRY RUN: git fetch --all --prune`)
    return Promise.resolve(0)
  }

  return new Promise((resolveExitCode) => {
    const child = spawn('git', ['fetch', '--all', '--prune'], {
      cwd: repoDir,
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    prefixStream(repoName, child.stdout, console.log)
    prefixStream(repoName, child.stderr, console.error)

    child.on('error', (error) => {
      console.error(`[${repoName}] Failed to start git fetch: ${error.message}`)
      resolveExitCode(1)
    })

    child.on('close', (code, signal) => {
      if (signal) {
        console.error(`[${repoName}] git fetch exited from signal ${signal}`)
        resolveExitCode(1)
        return
      }

      resolveExitCode(code ?? 1)
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
      const exitCode = await runFetch(repoName, repoDir, options.dryRun)

      if (exitCode === 0) {
        succeeded.add(repoName)
        continue
      }

      failed.add(repoName)
      console.error(`Failed: ${repoName} (exit ${exitCode})`)
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
  if (process.argv.slice(2).includes('--help')) usage()

  const { repos: targets, source } = await resolveFleetTargets({
    explicit: options.repos,
    envValue: process.env.FLEET_PROJECTS,
    exclude: options.exclude,
    fromRepo: options.fromRepo,
    log: (message) => console.error(message),
  })

  console.log('')
  console.log('Fleet Fetch')
  console.log('══════════════════════════════════════════════════════════════')
  console.log(`Apps dir: ${options.appsDir}`)
  console.log(`Targets:  ${targets.join(', ')}`)
  console.log(`Source:   ${source}`)
  console.log(`Parallel: ${Math.min(options.concurrency, targets.length)}`)
  if (options.dryRun) console.log('Mode:     dry run')
  if (options.continueOnError) console.log('Policy:   continue on error')
  console.log('')

  const { succeeded, failed } = await runTargets(targets, options)

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
