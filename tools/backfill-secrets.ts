/**
 * Backfill Secrets (`CRON_SECRET`, `NUXT_SESSION_PASSWORD`) for all fleet projects.
 * Run from the template repo with Doppler access to fleet projects
 * (e.g. FLEET_DOPPLER_TOKEN or doppler run --project where-run).
 *
 * Usage:
 *   npx tsx tools/backfill-secrets.ts [--projects=app1,app2] [--dry-run] [--force]
 *
 * Fleet membership is auto-discovered via the control-plane D1 registry (requires
 * CONTROL_PLANE_API_KEY in Doppler). You can also override the list:
 *   --projects=<comma-separated list>   (CLI flag)
 *   FLEET_PROJECTS=<comma-separated>    (environment variable)
 *
 * --dry-run: print what would be set, do not call Doppler.
 * --force: set secrets even if already present (rotates them).
 */

import crypto from 'node:crypto'
import { execSync } from 'node:child_process'
import { resolveFleetTargets } from './fleet-projects'

if (process.env.FLEET_DOPPLER_TOKEN) {
  process.env.DOPPLER_TOKEN = process.env.FLEET_DOPPLER_TOKEN
}

const cliArgs = process.argv.slice(2)
const projectsArg = cliArgs.find((a) => a.startsWith('--projects='))?.slice('--projects='.length)

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

async function main() {
  const dryRun = cliArgs.includes('--dry-run')
  const force = cliArgs.includes('--force')

  if (!isDopplerAvailable()) {
    console.error('❌ Doppler CLI not available. Install and log in, or set FLEET_DOPPLER_TOKEN.')
    process.exit(1)
  }

  const { repos: fleetProjects } = await resolveFleetTargets({
    explicit: projectsArg
      ? projectsArg
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      : [],
    envValue: process.env.FLEET_PROJECTS,
    log: (message) => console.error(message),
  })

  const SECRETS_TO_BACKFILL = ['CRON_SECRET', 'NUXT_SESSION_PASSWORD']

  console.log('')
  console.log(`Backfill Secrets (${SECRETS_TO_BACKFILL.join(', ')}) for fleet projects`)
  console.log('══════════════════════════════════════════════════════════════')
  if (dryRun) console.log('  (dry run — no changes)')
  if (force) console.log('  (force — overwrite existing)')
  console.log('')

  let setCount = 0
  let skipCount = 0
  let failCount = 0

  for (const project of fleetProjects) {
    for (const secretKey of SECRETS_TO_BACKFILL) {
      const hasPrd = hasSecret(project, 'prd', secretKey)
      const hasDev = hasSecret(project, 'dev', secretKey)

      if (!force && hasPrd && hasDev) {
        console.log(`  ⏭ ${project.padEnd(28)} already has ${secretKey}`)
        skipCount++
        continue
      }

      const generatedValue = crypto.randomBytes(32).toString('hex')

      if (dryRun) {
        console.log(`  [dry] ${project.padEnd(28)} would set ${secretKey} (prd + dev)`)
        setCount++
        continue
      }

      try {
        if (!hasPrd || force) setSecret(project, 'prd', secretKey, generatedValue)
        if (!hasDev || force) setSecret(project, 'dev', secretKey, generatedValue)
        console.log(`  ✅ ${project.padEnd(28)} ${secretKey} set (prd + dev)`)
        setCount++
      } catch (err: any) {
        console.log(`  ❌ ${project.padEnd(28)} ${err.message?.trim() || err}`)
        failCount++
      }
    }
  }

  console.log('══════════════════════════════════════════════════════════════')
  console.log(`  Set: ${setCount}  Skipped: ${skipCount}  Failed: ${failCount}`)
  console.log('')
  if (failCount > 0) process.exit(1)
}

main()
