#!/usr/bin/env npx tsx
/**
 * sync-canonical-to-fleet.ts
 *
 * Keeps `where-run` (Level 1 Fleet Hub) in sync with
 * `0_global-canonical-tokens` (Level 0 Canonical Hub).
 *
 * Because Doppler blocks daisy-chaining references, where-run
 * must store RAW copies of the canonical values. This script pulls from
 * the SaaS-specific configs in the Canonical Hub and pushes raw values
 * into where-run's dev and prd configs.
 *
 * Usage:
 *   npx tsx tools/sync-canonical-to-fleet.ts          # dry-run
 *   npx tsx tools/sync-canonical-to-fleet.ts --apply   # apply changes
 */

import { execSync } from 'node:child_process'

const DRY_RUN = !process.argv.includes('--apply')
const CANONICAL = '0_global-canonical-tokens'
const FLEET = 'where-run'

// Mapping: { canonicalConfig: { canonicalKey: fleetKey } }
// canonicalKey is the key in 0_global-canonical-tokens.<config>
// fleetKey is the key in where-run
const SYNC_MAP: Record<string, Record<string, string>> = {
  cloudflare: {
    CLOUDFLARE_ACCOUNT_ID: 'CLOUDFLARE_ACCOUNT_ID',
    CLOUDFLARE_API_TOKEN_WORKERS: 'CLOUDFLARE_API_TOKEN',
  },
  google: {
    GA_ACCOUNT_ID: 'GA_ACCOUNT_ID',
    GSC_SERVICE_ACCOUNT_JSON: 'GSC_SERVICE_ACCOUNT_JSON',
    GSC_USER_EMAIL: 'GSC_USER_EMAIL',
    GOOGLE_MAPS_PLATFORM_API_KEY_PUBLIC: 'GOOGLE_MAPS_PLATFORM_API_KEY',
  },
  posthog: {
    POSTHOG_HOST: 'POSTHOG_HOST',
    POSTHOG_PERSONAL_API_KEY: 'POSTHOG_PERSONAL_API_KEY',
    POSTHOG_PROJECT_ID: 'POSTHOG_PROJECT_ID',
    POSTHOG_PUBLIC_KEY: 'POSTHOG_PUBLIC_KEY',
  },
  github: {
    GITHUB_TOKEN_PACKAGES_READ: 'GITHUB_TOKEN_PACKAGES_READ',
  },
}

function getSecrets(project: string, config: string): Record<string, string> {
  const raw = execSync(
    `doppler secrets download --project ${project} --config ${config} --no-file --format json`,
    { encoding: 'utf-8' },
  )
  return JSON.parse(raw)
}

console.log(
  DRY_RUN
    ? '🔍 DRY RUN — no changes will be made. Pass --apply to commit.\n'
    : '🚀 APPLYING changes to where-run...\n',
)

// Fetch fleet hub's current values for both configs — hub-spoke values must stay in sync
const fleetSecretsByConfig: Record<string, Record<string, string>> = {
  prd: getSecrets(FLEET, 'prd'),
  dev: getSecrets(FLEET, 'dev'),
}

const updates: Record<string, string> = {}

for (const [saasConfig, keyMap] of Object.entries(SYNC_MAP)) {
  let canonicalSecrets: Record<string, string>
  try {
    canonicalSecrets = getSecrets(CANONICAL, saasConfig)
  } catch {
    console.log(`⚠️  Config '${saasConfig}' not found in ${CANONICAL}, skipping.`)
    continue
  }

  for (const [canonicalKey, fleetKey] of Object.entries(keyMap)) {
    const canonicalValue = canonicalSecrets[canonicalKey]

    if (!canonicalValue || canonicalValue === 'TO_BE_GENERATED') {
      continue
    }

    // Check both dev and prd — if either is out of sync, flag for update
    const driftingConfigs = (['prd', 'dev'] as const).filter(
      (cfg) => fleetSecretsByConfig[cfg][fleetKey] !== canonicalValue,
    )

    if (driftingConfigs.length > 0) {
      updates[fleetKey] = canonicalValue
      const preview = canonicalValue.slice(0, 12) + '...'
      const driftNote = driftingConfigs.length === 2 ? 'prd+dev' : driftingConfigs[0]
      console.log(
        `  ${fleetKey} ← ${CANONICAL}.${saasConfig}.${canonicalKey} (${preview}) [drift in: ${driftNote}]`,
      )
    }
  }
}

const numUpdates = Object.keys(updates).length

if (numUpdates === 0) {
  console.log('✅ Fleet Hub is already perfectly in sync with Canonical Hub.')
  process.exit(0)
}

console.log(`\n${numUpdates} key(s) to sync.`)

if (DRY_RUN) {
  console.log('\n🔍 Dry run complete. Run with --apply to commit these changes.')
} else {
  const setArgs = Object.entries(updates)
    .map(([k, v]) => `${k}='${v}'`)
    .join(' ')

  for (const config of ['dev', 'prd']) {
    execSync(`doppler secrets set ${setArgs} --project ${FLEET} --config ${config} --silent`, {
      encoding: 'utf-8',
    })
    console.log(`  ✅ Updated ${FLEET} / ${config}`)
  }

  console.log(`\n✅ Successfully synced ${numUpdates} key(s) from Canonical Hub → Fleet Hub.`)
}
