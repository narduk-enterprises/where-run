/**
 * Fleet Audit Script — Queries Doppler across all app projects and reports
 * analytics standardization status.
 *
 * Usage:
 *   tsx .agents/app-standardization/audit-fleet.ts
 *
 * Requirements:
 *   - Doppler CLI installed and authenticated
 */

import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { readdirSync, statSync } from 'node:fs'

// ─── Configuration ──────────────────────────────────────────
const APPS_DIR = join(process.env.HOME || '~', 'new-code')
const TEMPLATE_DIR = 'where-run'
const SKIP_DIRS = ['.vscode', '.DS_Store', TEMPLATE_DIR]

const REQUIRED_KEYS = [
  'GA_MEASUREMENT_ID',
  'SITE_URL',
  'INDEXNOW_KEY',
  'POSTHOG_PUBLIC_KEY',
  'GA_ACCOUNT_ID',
  'GSC_SERVICE_ACCOUNT_JSON',
] as const

// ─── Helpers ────────────────────────────────────────────────

function isDopplerAvailable(): boolean {
  try {
    execSync('doppler --version', { encoding: 'utf-8', stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

function getSecret(project: string, key: string): string {
  try {
    return execSync(`doppler secrets get "${key}" --project "${project}" --config prd --plain`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
  } catch {
    return ''
  }
}

function checkStructure(appDir: string): 'monorepo' | 'flat' | 'unknown' {
  if (existsSync(join(appDir, 'apps', 'web', 'nuxt.config.ts'))) return 'monorepo'
  if (existsSync(join(appDir, 'nuxt.config.ts'))) return 'flat'
  return 'unknown'
}

function checkLayerRef(appDir: string): 'published' | 'relative' | 'none' {
  const configPaths = [
    join(appDir, 'apps', 'web', 'nuxt.config.ts'),
    join(appDir, 'nuxt.config.ts'),
  ]
  for (const configPath of configPaths) {
    try {
      const content = require('node:fs').readFileSync(configPath, 'utf-8')
      if (content.includes('@narduk-enterprises/narduk-nuxt-template-layer')) return 'published'
      if (content.includes('../../layers/narduk-nuxt-layer')) return 'relative'
    } catch {
      /* file doesn't exist */
    }
  }
  return 'none'
}

// ─── Hub-Spoke Verification ────────────────────────────────

const HUB_KEYS: Record<string, string> = {
  CLOUDFLARE_API_TOKEN: 'where-run',
  CLOUDFLARE_ACCOUNT_ID: 'where-run',
  POSTHOG_PUBLIC_KEY: 'narduk-analytics',
  POSTHOG_PROJECT_ID: 'narduk-analytics',
  POSTHOG_HOST: 'narduk-analytics',
  GA_ACCOUNT_ID: 'narduk-analytics',
  GSC_SERVICE_ACCOUNT_JSON: 'narduk-analytics',
  GSC_USER_EMAIL: 'narduk-analytics',
}

function checkHubSpoke(project: string): { ok: boolean; issues: string[] } {
  const issues: string[] = []
  try {
    const raw = execSync(`doppler secrets --project "${project}" --config prd --json`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    const data = JSON.parse(raw)
    for (const [key, expectedHub] of Object.entries(HUB_KEYS)) {
      const entry = data[key]
      if (!entry) {
        issues.push(`${key}: MISSING`)
      } else if (entry.raw === entry.computed) {
        issues.push(`${key}: DIRECT (should → ${expectedHub})`)
      } else if (!entry.computed) {
        issues.push(`${key}: cross-ref resolves EMPTY (wrong hub?)`)
      }
    }
  } catch {
    issues.push('Doppler project not found')
  }
  return { ok: issues.length === 0, issues }
}

// ─── Main ───────────────────────────────────────────────────

function main() {
  if (!isDopplerAvailable()) {
    console.error(
      '❌ Doppler CLI not available. Install: https://docs.doppler.com/docs/install-cli',
    )
    process.exit(1)
  }

  console.log()
  console.log(`Fleet Standardization Audit — ${new Date().toISOString().split('T')[0]}`)
  console.log('═══════════════════════════════════════════════════════════════')
  console.log()

  const apps: string[] = []
  try {
    for (const entry of readdirSync(APPS_DIR)) {
      if (SKIP_DIRS.includes(entry)) continue
      const full = join(APPS_DIR, entry)
      if (statSync(full).isDirectory()) apps.push(entry)
    }
  } catch (e: any) {
    console.error(`❌ Cannot read ${APPS_DIR}: ${e.message}`)
    process.exit(1)
  }

  let fullyConfigured = 0
  const hubIssues: { app: string; issues: string[] }[] = []

  for (const app of apps.sort()) {
    const appDir = join(APPS_DIR, app)
    const structure = checkStructure(appDir)
    const layer = checkLayerRef(appDir)

    const keys: Record<string, boolean> = {}
    let allKeys = true
    for (const key of REQUIRED_KEYS) {
      const val = getSecret(app, key)
      keys[key] = !!val
      if (!val) allKeys = false
    }

    const hubCheck = checkHubSpoke(app)
    if (!hubCheck.ok) hubIssues.push({ app, issues: hubCheck.issues })

    if (allKeys && hubCheck.ok) fullyConfigured++

    // Format output
    const structIcon = structure === 'monorepo' ? '✅' : structure === 'flat' ? '❌' : '❓'
    const layerIcon = layer === 'published' ? '✅' : layer === 'relative' ? '⚠️' : '❌'
    const ga = keys.GA_MEASUREMENT_ID ? '✅ GA' : '❌ GA'
    const gsc = keys.SITE_URL && keys.GSC_SERVICE_ACCOUNT_JSON ? '✅ GSC' : '❌ GSC'
    const inow = keys.INDEXNOW_KEY ? '✅ INow' : '❌ INow'
    const ph = keys.POSTHOG_PUBLIC_KEY ? '✅ PH' : '❌ PH'
    const hub = hubCheck.ok ? '✅ hub' : '❌ hub'

    const name = app.padEnd(30)
    console.log(
      ` ${name} ${structIcon} struct  ${layerIcon} layer  ${ga}  ${gsc}  ${inow}  ${ph}  ${hub}`,
    )
  }

  console.log()
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(` Score: ${fullyConfigured}/${apps.length} apps fully configured`)
  console.log()

  if (hubIssues.length > 0) {
    console.log(' Hub-Spoke Issues:')
    for (const { app, issues } of hubIssues) {
      console.log(`   ${app}:`)
      for (const issue of issues) {
        console.log(`     ⚠ ${issue}`)
      }
    }
    console.log()
  }

  console.log(' Legend: struct=monorepo  layer=published pkg  GA=GA_MEASUREMENT_ID')
  console.log('         GSC=SITE_URL+SERVICE_ACCOUNT  INow=INDEXNOW_KEY  PH=POSTHOG_PUBLIC_KEY')
  console.log('         hub=all hub keys are cross-refs to where-run / narduk-analytics')
  console.log()
}

main()
