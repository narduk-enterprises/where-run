#!/usr/bin/env npx tsx
/**
 * SYNC-WORKFLOWS-TO-FLEET.TS
 * --------------------------
 * Copies the canonical `.agents/workflows/` files from the template
 * to every fleet app in the apps directory, keeping them perfectly in sync.
 *
 * Safe to re-run — uses content comparison to skip identical files.
 *
 * Usage:
 *   npx tsx tools/sync-workflows-to-fleet.ts                     # dry-run (default)
 *   npx tsx tools/sync-workflows-to-fleet.ts --apply              # write changes
 *   npx tsx tools/sync-workflows-to-fleet.ts --apply --prune      # also remove stale workflows
 *   npx tsx tools/sync-workflows-to-fleet.ts --apps-dir ~/other   # override apps directory
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATE_DIR = join(__dirname, '..')
const WORKFLOWS_REL = '.agents/workflows'
const TEMPLATE_WORKFLOWS = join(TEMPLATE_DIR, WORKFLOWS_REL)

// ── CLI flags ──

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const prune = args.includes('--prune')

const appsDirArg = (() => {
  const idx = args.indexOf('--apps-dir')
  if (idx !== -1 && args[idx + 1]) return args[idx + 1]
  const eq = args.find((a) => a.startsWith('--apps-dir='))
  if (eq) return eq.split('=')[1]
  return join(process.env.HOME || '~', 'new-code/template-apps')
})()
const APPS_DIR = appsDirArg.replace(/^~/, process.env.HOME || '')

// ── Helpers ──

function filesIdentical(a: string, b: string): boolean {
  try {
    return readFileSync(a).equals(readFileSync(b))
  } catch {
    return false
  }
}

// ── Main ──

function main() {
  if (!existsSync(TEMPLATE_WORKFLOWS)) {
    console.error(`Template workflows directory not found: ${TEMPLATE_WORKFLOWS}`)
    process.exit(1)
  }
  if (!existsSync(APPS_DIR)) {
    console.error(`Apps directory not found: ${APPS_DIR}`)
    process.exit(1)
  }

  // Discover canonical workflow files (*.md only)
  const canonicalFiles = readdirSync(TEMPLATE_WORKFLOWS)
    .filter((f) => f.endsWith('.md'))
    .sort()

  // Discover fleet apps
  const apps = readdirSync(APPS_DIR)
    .filter((d) => {
      try {
        return statSync(join(APPS_DIR, d)).isDirectory()
      } catch {
        return false
      }
    })
    .sort()

  console.log()
  console.log(`Sync Workflows to Fleet${apply ? '' : ' [DRY RUN]'}${prune ? ' [PRUNE]' : ''}`)
  console.log('═'.repeat(72))
  console.log(`  Template: ${TEMPLATE_WORKFLOWS}`)
  console.log(`  Apps dir: ${APPS_DIR}`)
  console.log(`  Canonical workflows: ${canonicalFiles.length}`)
  console.log(`  Fleet apps: ${apps.length}`)
  console.log()

  // Summary accumulators
  const summary: {
    name: string
    added: number
    updated: number
    pruned: number
    unchanged: number
  }[] = []

  for (const appName of apps) {
    const appDir = join(APPS_DIR, appName)
    const appWorkflows = join(appDir, WORKFLOWS_REL)

    let added = 0
    let updated = 0
    let pruned = 0
    let unchanged = 0

    // Ensure directory exists
    if (!existsSync(appWorkflows)) {
      if (apply) {
        mkdirSync(appWorkflows, { recursive: true })
      }
    }

    // Copy/update canonical workflows
    for (const file of canonicalFiles) {
      const src = join(TEMPLATE_WORKFLOWS, file)
      const dest = join(appWorkflows, file)

      if (existsSync(dest) && filesIdentical(src, dest)) {
        unchanged++
        continue
      }

      if (existsSync(dest)) {
        updated++
        console.log(`  ${appName}: UPDATE ${file}`)
      } else {
        added++
        console.log(`  ${appName}: ADD    ${file}`)
      }

      if (apply) {
        mkdirSync(dirname(dest), { recursive: true })
        copyFileSync(src, dest)
      }
    }

    // Prune stale workflows (files in app that aren't in canonical set)
    if (prune && existsSync(appWorkflows)) {
      const canonicalSet = new Set(canonicalFiles)
      const appFiles = readdirSync(appWorkflows).filter((f) => f.endsWith('.md'))

      for (const file of appFiles) {
        if (!canonicalSet.has(file)) {
          pruned++
          console.log(`  ${appName}: PRUNE  ${file}`)
          if (apply) {
            rmSync(join(appWorkflows, file), { force: true })
          }
        }
      }
    }

    summary.push({ name: appName, added, updated, pruned, unchanged })
  }

  // Print summary table
  console.log()
  console.log('═'.repeat(72))
  const col = (s: string, w: number) => s.padEnd(w)
  console.log(
    col('App', 30) + col('Added', 8) + col('Updated', 10) + col('Pruned', 9) + col('Same', 6),
  )
  console.log('─'.repeat(72))

  let totalAdded = 0
  let totalUpdated = 0
  let totalPruned = 0
  let totalUnchanged = 0

  for (const app of summary) {
    totalAdded += app.added
    totalUpdated += app.updated
    totalPruned += app.pruned
    totalUnchanged += app.unchanged

    const hasChanges = app.added > 0 || app.updated > 0 || app.pruned > 0
    const icon = hasChanges ? '🔄' : '✅'

    console.log(
      col(`${icon} ${app.name}`, 30) +
        col(String(app.added), 8) +
        col(String(app.updated), 10) +
        col(String(app.pruned), 9) +
        col(String(app.unchanged), 6),
    )
  }

  console.log('─'.repeat(72))
  console.log(
    col('TOTAL', 30) +
      col(String(totalAdded), 8) +
      col(String(totalUpdated), 10) +
      col(String(totalPruned), 9) +
      col(String(totalUnchanged), 6),
  )
  console.log()

  if (!apply) {
    console.log('🔍 Dry run complete. Run with --apply to commit changes.')
    console.log()
  } else {
    console.log(`✅ Synced ${totalAdded + totalUpdated} file(s) across ${apps.length} fleet apps.`)
    if (totalPruned > 0) console.log(`🗑  Pruned ${totalPruned} stale workflow(s).`)
    console.log()
  }
}

main()
