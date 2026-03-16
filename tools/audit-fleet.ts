/**
 * Fleet Audit Tool — single-command audit of all fleet apps.
 *
 * Checks:
 *  1. Template sync status (.template-version SHA vs current template HEAD)
 *  2. Doppler secret completeness (required + recommended)
 *  3. Layer version currency
 *  4. CI standardization (ci.yml matches canonical, extra workflows)
 *  5. Site reachability (HTTP check on SITE_URL)
 *  6. doppler.yaml presence + correctness
 *  7. D1 database name consistency (wrangler config vs package.json scripts)
 *  8. DOPPLER_TOKEN GitHub secret presence
 *  9. Critical package.json script alignment with template
 * 10. pnpm configuration alignment (overrides and onlyBuiltDependencies)
 * 11. Wrangler compatibility flag validation (nodejs_compat vs nodejs_compat_v2)
 * 12. Doppler hub reference verification (shared secrets should reference hub)
 * 13. GA4 property accessibility (GA_MEASUREMENT_ID presence in Doppler)
 * 14. GSC accessibility (service account can access sc-domain: or URL-prefix property)
 *
 * Usage:
 *   npx tsx tools/audit-fleet.ts [--apps-dir ~/new-code/template-apps] [--json]
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'

// ── Config ──

const args = process.argv.slice(2)
const jsonMode = args.includes('--json')
const appsArg =
  args.find((a) => a.startsWith('--apps-dir='))?.split('=')[1] ||
  args[args.indexOf('--apps-dir') + 1] ||
  join(process.env.HOME || '~', 'new-code/template-apps')
const APPS_DIR = appsArg.replace(/^~/, process.env.HOME || '')
const TEMPLATE_DIR = join(process.env.HOME || '~', 'new-code/where-run')

const REQUIRED_SECRETS = [
  'SITE_URL',
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID',
  'POSTHOG_PUBLIC_KEY',
]
const RECOMMENDED_SECRETS = [
  'GA_MEASUREMENT_ID',
  'GSC_SERVICE_ACCOUNT_JSON',
  'INDEXNOW_KEY',
  'GSC_USER_EMAIL',
  'GA_ACCOUNT_ID',
  'POSTHOG_HOST',
  'POSTHOG_PROJECT_ID',
]
const ALL_SECRETS = [...REQUIRED_SECRETS, ...RECOMMENDED_SECRETS]

const CANONICAL_WORKFLOWS = new Set(['ci.yml', 'weekly-drift-check.yml'])

// ── Helpers ──

function getTemplateSha(): string {
  try {
    return execSync('git rev-parse HEAD', {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: TEMPLATE_DIR,
    }).trim()
  } catch {
    return 'unknown'
  }
}

function getTemplateLayerVersion(): string {
  const pkgPath = join(TEMPLATE_DIR, 'layers/narduk-nuxt-layer/package.json')
  try {
    return JSON.parse(readFileSync(pkgPath, 'utf-8')).version || 'unknown'
  } catch {
    return 'unknown'
  }
}

function getCanonicalCi(): string {
  // Generate the same canonical ci.yml that sync-template.ts Phase 3 writes
  return `name: CI

on:
  workflow_dispatch:

concurrency:
  group: ci-\${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

# CI is disabled (workflow_dispatch only) to conserve GitHub Actions minutes.
# Deploy is done locally via \`pnpm run deploy\` (wrangler deploy).
# See .agents/workflows/deploy.md for the local deploy workflow.

jobs:
  quality:
    uses: narduk-enterprises/where-run/.github/workflows/reusable-quality.yml@main
    secrets:
      DOPPLER_TOKEN: \${{ secrets.DOPPLER_TOKEN }}
      GH_PACKAGES_TOKEN: \${{ secrets.GH_PACKAGES_TOKEN }}
`
}

function getDopplerSecrets(project: string): Set<string> | null {
  try {
    const out = execSync(
      `doppler secrets download --project "${project}" --config prd --no-file --format env`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
    )
    return new Set(
      out
        .split('\n')
        .map((l) => l.split('=')[0])
        .filter(Boolean),
    )
  } catch {
    return null
  }
}

function httpCheck(url: string): number {
  try {
    const code = execSync(`curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${url}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
    return parseInt(code, 10) || 0
  } catch {
    return 0
  }
}

const CRITICAL_SCRIPTS: Record<string, string> = {
  postinstall:
    "node -e \"if(!require('fs').existsSync('.setup-complete'))console.log('\\n⚠️  Run pnpm run setup before doing anything else! See AGENTS.md.\\n')\"",
  'build:plugins': 'pnpm --filter @narduk/eslint-config build',
  prelint: 'pnpm run build:plugins',
}

function hasGitHubSecret(repo: string, secretName: string): boolean {
  try {
    const out = execSync(`gh secret list --repo narduk-enterprises/${repo}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    return out.includes(secretName)
  } catch {
    return false
  }
}

interface AppAudit {
  name: string
  templateSha: string
  templateSynced: boolean
  layerVersion: string
  layerCurrent: boolean
  dopplerSecrets: { found: number; total: number; missing: string[] } | null
  dopplerYaml: { exists: boolean; project: string | null }
  ciStandard: boolean
  ciDiffs: string[]
  extraWorkflows: string[]
  siteUrl: string | null
  siteStatus: number
  d1Mismatch: string | null
  hasDopplerToken: boolean
  staleScripts: string[]
  pnpmMismatch: string[]
  wranglerIssues: string[]
  dopplerHubIssues: string[]
  gaMeasurementId: string | null
  gscAccess: 'ok' | 'no-access' | 'unknown'
}

// ── Main ──

function main() {
  if (!existsSync(APPS_DIR)) {
    console.error(`Apps directory not found: ${APPS_DIR}`)
    process.exit(1)
  }

  const templateSha = getTemplateSha()
  const templateLayer = getTemplateLayerVersion()
  const canonicalCi = getCanonicalCi()

  // Pre-fetch GSC accessible sites (once, shared across all apps)
  const gscSites = new Set<string>()
  try {
    const gscRaw = execSync(
      'doppler secrets get GSC_SERVICE_ACCOUNT_JSON --project where-run --config prd --plain',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
    ).trim()
    const gscJson = gscRaw.startsWith('{')
      ? gscRaw
      : Buffer.from(gscRaw, 'base64').toString('utf-8')
    const gscCreds = JSON.parse(gscJson)
    const now = Math.floor(Date.now() / 1000)
    const hdr = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
    const pld = Buffer.from(
      JSON.stringify({
        iss: gscCreds.client_email,
        scope: 'https://www.googleapis.com/auth/webmasters.readonly',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 300,
      }),
    ).toString('base64url')
    const { createSign } = require('node:crypto')
    const s = createSign('RSA-SHA256')
    s.update(`${hdr}.${pld}`)
    const sig = s.sign(gscCreds.private_key, 'base64url')
    const tResp = execSync(
      `curl -s -X POST -H "Content-Type: application/x-www-form-urlencoded" -d "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${hdr}.${pld}.${sig}" https://oauth2.googleapis.com/token`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
    )
    const at = JSON.parse(tResp).access_token
    if (at) {
      const sResp = execSync(
        `curl -s -H "Authorization: Bearer ${at}" https://www.googleapis.com/webmasters/v3/sites`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
      )
      for (const entry of JSON.parse(sResp).siteEntry || []) {
        gscSites.add(entry.siteUrl)
      }
    }
  } catch {}

  const apps = readdirSync(APPS_DIR)
    .filter((d) => statSync(join(APPS_DIR, d)).isDirectory())
    .sort()

  const results: AppAudit[] = []

  for (const appName of apps) {
    const appDir = join(APPS_DIR, appName)

    // Template sync
    let appSha = ''
    const versionPath = join(appDir, '.template-version')
    if (existsSync(versionPath)) {
      const content = readFileSync(versionPath, 'utf-8')
      const match = content.match(/sha=(.+)/)
      appSha = match?.[1] || ''
    }

    // Layer version
    const layerPkgPath = join(appDir, 'layers/narduk-nuxt-layer/package.json')
    let layerVersion = 'missing'
    if (existsSync(layerPkgPath)) {
      try {
        layerVersion = JSON.parse(readFileSync(layerPkgPath, 'utf-8')).version || 'missing'
      } catch {}
    }

    // Doppler secrets
    const secrets = getDopplerSecrets(appName)
    let dopplerResult: AppAudit['dopplerSecrets'] = null
    if (secrets) {
      const missing = ALL_SECRETS.filter((s) => !secrets.has(s))
      dopplerResult = {
        found: ALL_SECRETS.length - missing.length,
        total: ALL_SECRETS.length,
        missing,
      }
    }

    // doppler.yaml
    const dopplerYamlPath = join(appDir, 'doppler.yaml')
    let dopplerYaml: AppAudit['dopplerYaml'] = { exists: false, project: null }
    if (existsSync(dopplerYamlPath)) {
      const content = readFileSync(dopplerYamlPath, 'utf-8')
      const match = content.match(/project:\s*(.+)/)
      dopplerYaml = { exists: true, project: match?.[1]?.trim() || null }
    }

    // CI standardization
    const ciPath = join(appDir, '.github/workflows/ci.yml')
    let ciStandard = false
    const ciDiffs: string[] = []
    if (existsSync(ciPath)) {
      const current = readFileSync(ciPath, 'utf-8')
      if (current.trimEnd() === canonicalCi.trimEnd()) {
        ciStandard = true
      } else {
        if (!current.includes('needs: [quality]')) ciDiffs.push('missing needs:[quality]')
        if (!current.includes('reusable-quality.yml')) ciDiffs.push('not using reusable workflow')
        if (ciDiffs.length === 0) ciDiffs.push('minor differences')
      }
    } else {
      ciDiffs.push('ci.yml missing')
    }

    // Extra workflows
    const workflowDir = join(appDir, '.github/workflows')
    let extraWorkflows: string[] = []
    if (existsSync(workflowDir)) {
      extraWorkflows = readdirSync(workflowDir).filter(
        (f) => f.endsWith('.yml') && !CANONICAL_WORKFLOWS.has(f),
      )
    }

    // Site reachability
    let siteUrl: string | null = null
    if (secrets?.has('SITE_URL')) {
      try {
        const out = execSync(
          `doppler secrets get SITE_URL --project "${appName}" --config prd --plain`,
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
        ).trim()
        siteUrl = out || null
      } catch {}
    }
    const siteStatus = siteUrl ? httpCheck(siteUrl) : 0

    // D1 database name consistency
    let d1Mismatch: string | null = null
    const webDir = join(appDir, 'apps/web')
    const wranglerJson = join(webDir, 'wrangler.json')
    const wranglerToml = join(webDir, 'wrangler.toml')
    const webPkgPath = join(webDir, 'package.json')
    let wranglerDbName: string | null = null
    if (existsSync(wranglerJson)) {
      try {
        const wrangler = JSON.parse(readFileSync(wranglerJson, 'utf-8'))
        wranglerDbName = wrangler.d1_databases?.[0]?.database_name || null
      } catch {}
    } else if (existsSync(wranglerToml)) {
      try {
        const content = readFileSync(wranglerToml, 'utf-8')
        const match = content.match(/database_name\s*=\s*"([^"]+)"/)
        wranglerDbName = match?.[1] || null
      } catch {}
    }
    if (wranglerDbName && existsSync(webPkgPath)) {
      try {
        const webPkg = JSON.parse(readFileSync(webPkgPath, 'utf-8'))
        const migrateScript = webPkg.scripts?.['db:migrate'] || ''
        if (migrateScript.includes('web-db') && wranglerDbName !== 'web-db') {
          d1Mismatch = `script uses 'web-db' but wrangler has '${wranglerDbName}'`
        } else if (
          migrateScript &&
          !migrateScript.includes(wranglerDbName) &&
          !migrateScript.includes('.sh')
        ) {
          d1Mismatch = `db:migrate doesn't reference '${wranglerDbName}'`
        }
      } catch {}
    }

    // DOPPLER_TOKEN GitHub secret
    const hasDopplerToken = hasGitHubSecret(appName, 'DOPPLER_TOKEN')

    // Stale package.json scripts
    const staleScripts: string[] = []
    try {
      const rootPkg = JSON.parse(readFileSync(join(appDir, 'package.json'), 'utf-8'))
      for (const [name, expected] of Object.entries(CRITICAL_SCRIPTS)) {
        if (rootPkg.scripts?.[name] && rootPkg.scripts[name] !== expected) {
          staleScripts.push(name)
        }
      }
    } catch {}

    // Pnpm configuration
    const pnpmMismatch: string[] = []
    try {
      const rootPkg = JSON.parse(readFileSync(join(appDir, 'package.json'), 'utf-8'))
      const templatePkg = JSON.parse(readFileSync(join(TEMPLATE_DIR, 'package.json'), 'utf-8'))
      if (JSON.stringify(rootPkg.pnpm?.overrides) !== JSON.stringify(templatePkg.pnpm?.overrides)) {
        pnpmMismatch.push('overrides')
      }
      if (
        JSON.stringify(rootPkg.pnpm?.onlyBuiltDependencies) !==
        JSON.stringify(templatePkg.pnpm?.onlyBuiltDependencies)
      ) {
        pnpmMismatch.push('onlyBuiltDependencies')
      }
    } catch {}

    // Wrangler compatibility flags
    const wranglerIssues: string[] = []
    if (existsSync(wranglerJson)) {
      try {
        const wrangler = JSON.parse(readFileSync(wranglerJson, 'utf-8'))
        const flags: string[] = wrangler.compatibility_flags || []
        if (flags.includes('nodejs_compat_v2')) {
          wranglerIssues.push('nodejs_compat_v2 (use nodejs_compat)')
        }
        if (!flags.includes('nodejs_compat') && !flags.includes('nodejs_compat_v2')) {
          wranglerIssues.push('missing nodejs_compat flag')
        }
      } catch {}
    }

    // Doppler hub reference check
    const dopplerHubIssues: string[] = []
    const HUB_SECRETS = [
      'CLOUDFLARE_ACCOUNT_ID',
      'CLOUDFLARE_API_TOKEN',
      'POSTHOG_HOST',
      'POSTHOG_PERSONAL_API_KEY',
      'POSTHOG_PROJECT_ID',
      'POSTHOG_PUBLIC_KEY',
      'GA_ACCOUNT_ID',
      'GSC_SERVICE_ACCOUNT_JSON',
      'GSC_USER_EMAIL',
    ]
    try {
      const token = execSync(
        `doppler configs tokens create audit-${Date.now()} --project "${appName}" --config prd --plain`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
      ).trim()
      const resp = execSync(
        `curl -s -H "Authorization: Bearer ${token}" "https://api.doppler.com/v3/configs/config/secrets"`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
      )
      const data = JSON.parse(resp)
      const secrets = data.secrets || {}
      for (const key of HUB_SECRETS) {
        if (secrets[key]?.raw && !secrets[key].raw.includes('${')) {
          dopplerHubIssues.push(key)
        }
      }
    } catch {}

    // GA4 property check (GA_MEASUREMENT_ID in Doppler)
    let gaMeasurementId: string | null = null
    try {
      const mid = execSync(
        `doppler secrets get GA_MEASUREMENT_ID --project "${appName}" --config prd --plain`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
      ).trim()
      gaMeasurementId = mid || null
    } catch {}

    // GSC accessibility check
    let gscAccess: 'ok' | 'no-access' | 'unknown' = 'unknown'
    if (gscSites.size > 0 && siteUrl) {
      try {
        const hostname = new URL(siteUrl).hostname
        const scDomain = `sc-domain:${hostname}`
        const urlPfx = `${siteUrl.replace(/\/$/, '')}/`
        gscAccess = gscSites.has(scDomain) || gscSites.has(urlPfx) ? 'ok' : 'no-access'
      } catch {}
    }

    results.push({
      name: appName,
      templateSha: appSha,
      templateSynced: appSha === templateSha,
      layerVersion,
      layerCurrent: layerVersion === templateLayer,
      dopplerSecrets: dopplerResult,
      dopplerYaml,
      ciStandard,
      ciDiffs,
      extraWorkflows,
      siteUrl,
      siteStatus,
      d1Mismatch,
      hasDopplerToken,
      staleScripts,
      pnpmMismatch,
      wranglerIssues,
      dopplerHubIssues,
      gaMeasurementId,
      gscAccess,
    })
  }

  if (jsonMode) {
    console.log(JSON.stringify({ templateSha, templateLayer, apps: results }, null, 2))
    return
  }

  // Pretty print
  console.log()
  console.log('Fleet Audit Report')
  console.log(`Template SHA: ${templateSha.slice(0, 12)}  |  Layer: ${templateLayer}`)
  console.log('═'.repeat(90))

  const col = (s: string, w: number) => s.padEnd(w)

  console.log(
    col('App', 28) +
      col('Layer', 8) +
      col('Doppler', 10) +
      col('YAML', 6) +
      col('CI', 10) +
      col('Site', 6) +
      'Notes',
  )
  console.log('─'.repeat(90))

  let issues = 0
  for (const app of results) {
    const layerIcon = app.layerCurrent ? '✅' : '🔴'
    const dopplerIcon = !app.dopplerSecrets
      ? '❌'
      : app.dopplerSecrets.missing.length === 0
        ? '✅'
        : '🟠'
    const dopplerCount = app.dopplerSecrets
      ? `${app.dopplerSecrets.found}/${app.dopplerSecrets.total}`
      : 'N/A'
    const yamlIcon = app.dopplerYaml.exists ? '✅' : '❌'
    const ciIcon = app.ciStandard ? '✅' : '⚠️'
    const siteIcon = app.siteStatus === 200 ? '✅' : app.siteStatus > 0 ? `${app.siteStatus}` : '❌'

    const notes: string[] = []
    if (!app.layerCurrent) notes.push(`layer=${app.layerVersion}`)
    if (app.dopplerSecrets?.missing.length)
      notes.push(`miss: ${app.dopplerSecrets.missing.join(',')}`)
    if (app.dopplerYaml.exists && app.dopplerYaml.project !== app.name)
      notes.push(`yaml project mismatch`)
    if (app.ciDiffs.length) notes.push(app.ciDiffs.join(', '))
    if (app.extraWorkflows.length) notes.push(`+${app.extraWorkflows.join(',')}`)
    if (app.d1Mismatch) notes.push(`D1: ${app.d1Mismatch}`)
    if (!app.hasDopplerToken) notes.push('no GH DOPPLER_TOKEN')
    if (app.staleScripts.length) notes.push(`stale: ${app.staleScripts.join(',')}`)
    if (app.pnpmMismatch.length) notes.push(`pnpm: ${app.pnpmMismatch.join(',')}`)
    if (app.wranglerIssues.length) notes.push(`wrangler: ${app.wranglerIssues.join(',')}`)
    if (app.dopplerHubIssues.length) notes.push(`hub: ${app.dopplerHubIssues.join(',')}`)
    if (!app.gaMeasurementId) notes.push('no GA_MEASUREMENT_ID')
    if (app.gscAccess === 'no-access') notes.push('no GSC access')

    if (notes.length) issues++

    console.log(
      col(app.name, 28) +
        col(`${layerIcon} ${app.layerVersion}`, 8) +
        col(`${dopplerIcon} ${dopplerCount}`, 10) +
        col(yamlIcon, 6) +
        col(ciIcon, 10) +
        col(siteIcon, 6) +
        notes.join(' | '),
    )
  }

  console.log('═'.repeat(90))
  console.log(
    `${results.length} apps audited  |  ${issues} with issues  |  ${results.length - issues} clean`,
  )
  console.log()
}

main()
