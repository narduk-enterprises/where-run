/**
 * Backfill `GITHUB_TOKEN_PACKAGES_READ` into fleet spokes as a hub reference.
 *
 * The canonical raw token lives in `0_global-canonical-tokens`, is mirrored into
 * `where-run`, and spokes should reference the fleet hub value rather
 * than storing independent copies.
 *
 * Usage:
 *   doppler run -- npx tsx tools/backfill-github-packages-read.ts
 *   doppler run -- npx tsx tools/backfill-github-packages-read.ts --projects=app1,app2
 *   doppler run -- npx tsx tools/backfill-github-packages-read.ts --dry-run
 */

import { execSync } from 'node:child_process'
import { resolveFleetTargets } from './fleet-projects'

const HUB_PROJECT = 'where-run'
const HUB_CONFIG = 'prd'
const SECRET_KEY = 'GITHUB_TOKEN_PACKAGES_READ'
const HUB_REF_VALUE = `\${${HUB_PROJECT}.${HUB_CONFIG}.${SECRET_KEY}}`

if (process.env.FLEET_DOPPLER_TOKEN) {
  process.env.DOPPLER_TOKEN = process.env.FLEET_DOPPLER_TOKEN
}

const cliArgs = process.argv.slice(2)
const projectsArg = cliArgs.find((a) => a.startsWith('--projects='))?.slice('--projects='.length)
const dryRun = cliArgs.includes('--dry-run')

function isDopplerAvailable(): boolean {
  try {
    execSync('doppler --version', { encoding: 'utf-8', stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

function getComputedSecret(project: string, config: string, key: string): string {
  try {
    const output = execSync(
      `doppler secrets get ${key} --project "${project}" --config ${config} --json`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
    )
    const parsed = JSON.parse(output) as Record<string, { computed?: string }>
    return parsed[key]?.computed || ''
  } catch {
    return ''
  }
}

function setHubReference(project: string, config: string, key: string, value: string): void {
  const escaped = value.replace(/'/g, "'\"'\"'")
  execSync(`doppler secrets set ${key}='${escaped}' --project "${project}" --config ${config}`, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
}

async function main() {
  if (!isDopplerAvailable()) {
    console.error('❌ Doppler CLI not available. Install and log in, or set FLEET_DOPPLER_TOKEN.')
    process.exit(1)
  }

  const hubValue = getComputedSecret(HUB_PROJECT, HUB_CONFIG, SECRET_KEY)
  if (!hubValue) {
    console.error(`❌ Missing ${SECRET_KEY} in ${HUB_PROJECT}/${HUB_CONFIG}.`)
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

  console.log('')
  console.log(`Backfill ${SECRET_KEY} hub refs`)
  console.log('══════════════════════════════════════════════════════════════')
  console.log(`Hub source: ${HUB_PROJECT}/${HUB_CONFIG}`)
  if (dryRun) console.log('Mode: dry run')
  console.log('')

  let updated = 0
  let alreadyCurrent = 0
  let failed = 0

  for (const project of fleetProjects) {
    for (const config of ['dev', 'prd'] as const) {
      try {
        const current = getComputedSecret(project, config, SECRET_KEY)
        if (current === hubValue) {
          console.log(`  ✅ ${project.padEnd(28)} ${config} already resolves to hub value`)
          alreadyCurrent++
          continue
        }

        if (dryRun) {
          console.log(`  [dry] ${project.padEnd(28)} ${config} ← ${HUB_REF_VALUE}`)
          updated++
          continue
        }

        setHubReference(project, config, SECRET_KEY, HUB_REF_VALUE)
        console.log(`  ✅ ${project.padEnd(28)} ${config} set to hub ref`)
        updated++
      } catch (error: any) {
        console.log(`  ❌ ${project.padEnd(28)} ${config} ${error.message?.trim() || error}`)
        failed++
      }
    }
  }

  console.log('══════════════════════════════════════════════════════════════')
  console.log(`  Updated: ${updated}  Already current: ${alreadyCurrent}  Failed: ${failed}`)
  console.log('')

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
})
