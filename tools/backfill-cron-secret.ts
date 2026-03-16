/**
 * Backfill CRON_SECRET for all fleet projects in template-apps.
 * Run from the template repo with Doppler access to fleet projects
 * (e.g. FLEET_DOPPLER_TOKEN or doppler run --project where-run).
 *
 * Usage:
 *   npx tsx tools/backfill-cron-secret.ts --projects=app1,app2 [--dry-run] [--force]
 *   FLEET_PROJECTS=app1,app2 npx tsx tools/backfill-cron-secret.ts
 *
 * Fleet membership is owned by the control-plane D1 registry — this script does NOT
 * maintain a hardcoded list of project names. Pass them via:
 *   --projects=<comma-separated list>   (CLI flag)
 *   FLEET_PROJECTS=<comma-separated>    (environment variable)
 *
 * --dry-run: print what would be set, do not call Doppler.
 * --force: set CRON_SECRET even if already present (rotates the secret).
 */

import crypto from 'node:crypto'
import { execSync } from 'node:child_process'

if (process.env.FLEET_DOPPLER_TOKEN) {
  process.env.DOPPLER_TOKEN = process.env.FLEET_DOPPLER_TOKEN
}

const cliArgs = process.argv.slice(2)
const projectsArg = cliArgs.find((a) => a.startsWith('--projects='))?.slice('--projects='.length)
const FLEET_PROJECTS: string[] = (projectsArg ?? process.env.FLEET_PROJECTS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

if (FLEET_PROJECTS.length === 0) {
  console.error('❌ No fleet projects specified.')
  console.error(
    '  Provide --projects=app1,app2 or set FLEET_PROJECTS=app1,app2 environment variable.',
  )
  process.exit(1)
}

function isDopplerAvailable(): boolean {
  try {
    execSync('doppler --version', { encoding: 'utf-8', stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

function hasSecret(project: string, config: string, key: string): boolean {
  try {
    execSync(`doppler secrets get ${key} --project "${project}" --config ${config} --plain`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    return true
  } catch {
    return false
  }
}

function setSecret(project: string, config: string, key: string, value: string): void {
  const safe = value.replace(/'/g, "'\"'\"'")
  execSync(`doppler secrets set ${key}='${safe}' --project "${project}" --config ${config}`, {
    stdio: 'pipe',
  })
}

function main() {
  const dryRun = cliArgs.includes('--dry-run')
  const force = cliArgs.includes('--force')

  if (!isDopplerAvailable()) {
    console.error('❌ Doppler CLI not available. Install and log in, or set FLEET_DOPPLER_TOKEN.')
    process.exit(1)
  }

  console.log('')
  console.log('Backfill CRON_SECRET for fleet projects')
  console.log('════════════════════════════════════════')
  if (dryRun) console.log('  (dry run — no changes)')
  if (force) console.log('  (force — overwrite existing)')
  console.log('')

  let setCount = 0
  let skipCount = 0
  let failCount = 0

  for (const project of FLEET_PROJECTS) {
    const hasPrd = hasSecret(project, 'prd', 'CRON_SECRET')
    const hasDev = hasSecret(project, 'dev', 'CRON_SECRET')
    if (!force && hasPrd && hasDev) {
      console.log(`  ⏭ ${project.padEnd(28)} already has CRON_SECRET`)
      skipCount++
      continue
    }
    const secret = crypto.randomBytes(32).toString('hex')
    if (dryRun) {
      console.log(`  [dry] ${project.padEnd(28)} would set CRON_SECRET (prd + dev)`)
      setCount++
      continue
    }
    try {
      if (!hasPrd || force) setSecret(project, 'prd', 'CRON_SECRET', secret)
      if (!hasDev || force) setSecret(project, 'dev', 'CRON_SECRET', secret)
      console.log(`  ✅ ${project.padEnd(28)} CRON_SECRET set (prd + dev)`)
      setCount++
    } catch (err: any) {
      console.log(`  ❌ ${project.padEnd(28)} ${err.message?.trim() || err}`)
      failCount++
    }
  }

  console.log('════════════════════════════════════════')
  console.log(`  Set: ${setCount}  Skipped: ${skipCount}  Failed: ${failCount}`)
  console.log('')
  if (failCount > 0) process.exit(1)
}

main()
