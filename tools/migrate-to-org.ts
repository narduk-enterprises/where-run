/**
 * MIGRATE-TO-ORG.TS — Transfer a Derived App to narduk-enterprises
 * ----------------------------------------------------------------
 * Handles the full migration of a derived app repo from a personal
 * GitHub account into the narduk-enterprises organization, then
 * standardizes it against the current template.
 *
 * Usage:
 *   npx tsx tools/migrate-to-org.ts <app-dir>
 *   npx tsx tools/migrate-to-org.ts ~/new-code/your-app
 *   npx tsx tools/migrate-to-org.ts ~/new-code/your-app --dry-run
 *   npx tsx tools/migrate-to-org.ts ~/new-code/your-app --skip-transfer
 *
 * Options:
 *   --dry-run        Show what would change without writing anything
 *   --skip-transfer  Skip the GitHub repo transfer (already moved)
 *
 * What this does (in order):
 *   1. Transfer the GitHub repo to narduk-enterprises (via gh api)
 *   2. Update local git remotes
 *   3. Run sync-template.ts to standardize infra
 *   4. Replace loganrenz → narduk-enterprises across all app files
 *   5. Regenerate pnpm-lock.yaml
 *   6. Update the control-plane managed repo catalog
 *   7. Commit and push
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATE_DIR = join(__dirname, '..')
const TARGET_ORG = 'narduk-enterprises'

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')))
const dryRun = flags.has('--dry-run')
const skipTransfer = flags.has('--skip-transfer')

const appDir = args[0]?.replace(/^~/, process.env.HOME || '')
if (!appDir) {
  console.error(
    'Usage: npx tsx tools/migrate-to-org.ts <app-directory> [--dry-run] [--skip-transfer]',
  )
  console.error('  e.g: npx tsx tools/migrate-to-org.ts ~/new-code/your-app')
  process.exit(1)
}

if (!existsSync(appDir)) {
  console.error(`App directory not found: ${appDir}`)
  process.exit(1)
}

const appName = appDir.split('/').pop() || 'unknown'

function run(cmd: string, opts: { cwd?: string; stdio?: 'inherit' | 'pipe' } = {}) {
  return execSync(cmd, {
    encoding: 'utf-8',
    stdio: opts.stdio || 'pipe',
    cwd: opts.cwd || appDir,
  }).trim()
}

function walkTextFiles(dir: string): string[] {
  const skip = new Set([
    'node_modules',
    '.git',
    '.nuxt',
    '.output',
    'dist',
    '.wrangler',
    '.turbo',
    '.data',
  ])
  const binaryExt = /\.(png|jpe?g|gif|webp|svg|ico|ttf|woff2?|sqlite|db|lock)$/i
  const files: string[] = []

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkTextFiles(full))
    } else if (!binaryExt.test(entry.name)) {
      files.push(full)
    }
  }
  return files
}

function main() {
  console.log()
  console.log(`Org Migration: ${appName}${dryRun ? ' [DRY RUN]' : ''}`)
  console.log(`═══════════════════════════════════════════════════════════════`)
  console.log(`  App:      ${appDir}`)
  console.log(`  Target:   ${TARGET_ORG}`)
  console.log()

  // ── Step 1: Detect current repo owner ──
  console.log('Step 1: Detecting current GitHub repo...')
  let currentOwner = ''
  let repoName = appName
  try {
    const remoteUrl = run('git remote get-url origin')
    const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/)
    if (match) {
      currentOwner = match[1]
      repoName = match[2]
    }
  } catch {
    /* no remote */
  }

  if (!currentOwner) {
    console.error('  Could not detect GitHub repo owner from git remote.')
    process.exit(1)
  }

  console.log(`  Current: ${currentOwner}/${repoName}`)

  if (currentOwner === TARGET_ORG) {
    console.log(`  Already in ${TARGET_ORG}. Skipping transfer.`)
  } else if (skipTransfer) {
    console.log(`  --skip-transfer: skipping GitHub transfer.`)
  } else {
    // ── Step 2: Transfer repo ──
    console.log()
    console.log(`Step 2: Transferring ${currentOwner}/${repoName} → ${TARGET_ORG}/${repoName}...`)
    if (!dryRun) {
      try {
        run(
          `gh api repos/${currentOwner}/${repoName}/transfer -f new_owner=${TARGET_ORG} --silent`,
          { cwd: TEMPLATE_DIR },
        )
        console.log(`  ✅ Repository transferred to ${TARGET_ORG}/${repoName}`)
        // Give GitHub a moment to process the transfer
        console.log('  Waiting for transfer to propagate...')
        execSync('sleep 5')
      } catch (e: any) {
        const msg = e.stderr || e.message || ''
        if (msg.includes('already exists')) {
          console.log(`  ⏭ ${TARGET_ORG}/${repoName} already exists.`)
        } else {
          console.error(`  ❌ Transfer failed: ${msg}`)
          console.error(
            '  You may need to transfer manually at https://github.com/settings/repositories',
          )
          console.error(`  Then re-run with --skip-transfer`)
          process.exit(1)
        }
      }
    } else {
      console.log(`  Would transfer ${currentOwner}/${repoName} → ${TARGET_ORG}/${repoName}`)
    }
  }

  // ── Step 3: Update git remotes ──
  console.log()
  console.log('Step 3: Updating git remotes...')
  const newOrigin = `https://github.com/${TARGET_ORG}/${repoName}.git`
  const newTemplate = `https://github.com/${TARGET_ORG}/where-run.git`

  if (!dryRun) {
    try {
      run(`git remote set-url origin ${newOrigin}`)
    } catch {
      /* ignore */
    }
    try {
      run(`git remote set-url template ${newTemplate}`)
    } catch {
      try {
        run(`git remote add template ${newTemplate}`)
      } catch {
        /* already exists */
      }
    }
  }
  console.log(`  origin   → ${newOrigin}`)
  console.log(`  template → ${newTemplate}`)

  // ── Step 4: Run sync-template ──
  console.log()
  console.log('Step 4: Running sync-template...')
  const syncArgs = dryRun ? '--dry-run' : ''
  try {
    run(`npx tsx tools/sync-template.ts ${appDir} ${syncArgs}`, {
      cwd: TEMPLATE_DIR,
      stdio: 'inherit',
    })
  } catch {
    console.warn('  ⚠️ sync-template had issues (non-fatal)')
  }

  // ── Step 5: Replace loganrenz → narduk-enterprises across all files ──
  console.log()
  console.log('Step 5: Replacing org references (loganrenz → narduk-enterprises)...')
  const files = walkTextFiles(appDir)
  let replacedFiles = 0

  for (const file of files) {
    try {
      const original = readFileSync(file, 'utf-8')
      if (!original.includes('loganrenz')) continue

      const updated = original.replace(/loganrenz/g, TARGET_ORG)

      if (original !== updated) {
        if (!dryRun) {
          writeFileSync(file, updated, 'utf-8')
        }
        const rel = file.replace(appDir + '/', '')
        console.log(`  UPDATE: ${rel}`)
        replacedFiles++
      }
    } catch {
      /* skip unreadable files */
    }
  }
  console.log(`  ${replacedFiles} files updated.`)

  // ── Step 6: Regenerate lockfile ──
  console.log()
  console.log('Step 6: Regenerating pnpm-lock.yaml...')
  if (!dryRun) {
    try {
      run('pnpm install --no-frozen-lockfile', { stdio: 'inherit' })
    } catch {
      console.warn('  ⚠️ pnpm install had peer dep warnings (non-fatal)')
    }
  } else {
    console.log('  Would run pnpm install --no-frozen-lockfile')
  }

  // ── Step 7: Control-plane managed repo follow-up ──
  console.log()
  console.log('Step 7: Updating control-plane managed repo catalog...')
  console.log('  ℹ️ Sync membership is now owned by control-plane, not GitHub sync workflows.')
  console.log(
    '  Add the repo to control-plane/apps/web/server/data/managed-repos.ts and re-export config/fleet-sync-repos.json.',
  )

  // ── Step 8: Commit and push ──
  console.log()
  console.log('Step 8: Committing and pushing...')
  if (!dryRun) {
    try {
      run('git add -A')
      const status = run('git status --porcelain')
      if (status) {
        run(`git commit -m "chore: migrate to ${TARGET_ORG} org and sync with template infra"`)
        console.log('  ✅ Changes committed.')

        try {
          run('git push origin main')
          console.log('  ✅ Pushed to origin.')
        } catch (e: any) {
          console.warn(`  ⚠️ Push failed: ${e.message}`)
          console.log('  Run manually: git push origin main')
        }
      } else {
        console.log('  No changes to commit.')
      }
    } catch (e: any) {
      console.warn(`  ⚠️ Commit failed: ${e.message}`)
    }
  }

  // ── Summary ──
  console.log()
  console.log('═══════════════════════════════════════════════════════════════')
  if (dryRun) {
    console.log(' DRY RUN — no changes were made.')
    console.log(' Re-run without --dry-run to apply.')
  } else {
    console.log(` Migration complete: ${TARGET_ORG}/${repoName}`)
    console.log()
    console.log(' Next steps:')
    console.log('   1. Verify: gh repo view narduk-enterprises/' + repoName)
    console.log('   2. Push template sync bot update:')
    console.log(
      `      cd ${TEMPLATE_DIR} && git add -A && git commit -m "chore: add ${repoName} to sync bot fleet" && git push`,
    )
    console.log('   3. Set up Doppler: doppler setup --project ' + repoName + ' --config dev')
    console.log('   4. Verify CI: gh run list --repo narduk-enterprises/' + repoName)
  }
  console.log()
}

main()
