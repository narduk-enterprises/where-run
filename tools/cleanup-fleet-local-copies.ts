#!/usr/bin/env npx tsx
/**
 * Fleet Layer Promotion Cleanup
 *
 * Removes local auth, D1 cache, and shadowed SEO composables from fleet apps
 * that now get these from the shared layer.
 *
 * Usage:
 *   npx tsx tools/cleanup-fleet-local-copies.ts [--dry-run] [--fleet-dir=<path>] [--apps=app1,app2]
 *
 * Options:
 *   --dry-run              Print what would be removed, without deleting
 *   --fleet-dir=<path>     Path to directory containing all fleet app folders
 *                          (overrides FLEET_DIR env var)
 *   --apps=<list>          Comma-separated list of app names to clean
 *                          (runs the auth cleanup on exactly those apps)
 *
 * Without --apps, the script cleans apps listed in the AUTH_APPS constant
 * and the D1/SEO lists. Update those constants or use --apps to target
 * specific apps without modifying the source.
 *
 * The fleet directory can also be provided via the FLEET_DIR environment variable.
 */

import { existsSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')

const fleetDirArg = args.find((a) => a.startsWith('--fleet-dir='))?.slice('--fleet-dir='.length)
const FLEET_DIR = fleetDirArg ?? process.env.FLEET_DIR ?? ''

if (!FLEET_DIR) {
  console.error('❌ Fleet directory not specified.')
  console.error('  Provide --fleet-dir=<path> or set FLEET_DIR environment variable.')
  process.exit(1)
}

const appsArg = args.find((a) => a.startsWith('--apps='))?.slice('--apps='.length)
const overrideApps = appsArg
  ? appsArg
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : null

// ─── Auth files to remove ───────────────────────────────────────
// Apps that implement the custom D1 session pattern.
// Override at runtime with --apps=app1,app2 without editing this file.
const AUTH_APPS: string[] = overrideApps ?? []

const AUTH_FILES_TO_REMOVE = [
  'apps/web/server/utils/password.ts',
  'apps/web/server/utils/session.ts',
  'apps/web/server/utils/requireAuth.ts',
]

// ─── D1 Cache files to remove ───────────────────────────────────
// Add entries here when an app's local D1 cache util is superseded by the layer.
const D1_CACHE_CLEANUP: { app: string; file: string }[] = []

// ─── Shadowed SEO composables to remove ─────────────────────────
// These shadow the layer's useSeo/useSchemaOrg with local copies.
// Add entries here when an app's local composable should be replaced by the layer version.
const SHADOWED_SEO: { app: string; files: string[] }[] = []

let totalRemoved = 0
let totalSkipped = 0

function removeFile(appName: string, relPath: string): void {
  const fullPath = join(FLEET_DIR, appName, relPath)
  if (!existsSync(fullPath)) {
    console.log(`  SKIP  ${relPath} (not found)`)
    totalSkipped++
    return
  }
  if (DRY_RUN) {
    console.log(`  WOULD REMOVE  ${relPath}`)
  } else {
    unlinkSync(fullPath)
    console.log(`  REMOVED  ${relPath}`)
  }
  totalRemoved++
}

console.log(`\nFleet Layer Promotion Cleanup ${DRY_RUN ? '[DRY RUN]' : '[LIVE]'}`)
console.log('═'.repeat(72))

// ─── Auth cleanup ───────────────────────────────────────────────
console.log('\n🔑 Auth System Cleanup')
console.log('─'.repeat(72))
for (const app of AUTH_APPS) {
  console.log(`\n  ${app}:`)
  for (const file of AUTH_FILES_TO_REMOVE) {
    removeFile(app, file)
  }
}

// ─── D1 Cache cleanup ──────────────────────────────────────────
console.log('\n\n💾 D1 Cache Cleanup')
console.log('─'.repeat(72))
for (const { app, file } of D1_CACHE_CLEANUP) {
  console.log(`\n  ${app}:`)
  removeFile(app, file)
}

// ─── Shadowed SEO cleanup ──────────────────────────────────────
console.log('\n\n🔍 Shadowed SEO Composable Cleanup')
console.log('─'.repeat(72))
for (const { app, files } of SHADOWED_SEO) {
  console.log(`\n  ${app}:`)
  for (const file of files) {
    removeFile(app, file)
  }
}

// ─── Summary ────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(72)}`)
console.log(`${DRY_RUN ? 'Would remove' : 'Removed'}: ${totalRemoved} files`)
console.log(`Skipped (not found): ${totalSkipped} files`)
if (DRY_RUN) {
  console.log('\nRe-run without --dry-run to apply changes.')
}
