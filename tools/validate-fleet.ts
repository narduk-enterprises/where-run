#!/usr/bin/env npx tsx
/**
 * validate-fleet.ts — Pluggable Fleet-Wide Validation
 *
 * Runs a set of validators against every fleet app and produces a unified report.
 * New validators can be added by implementing the Validator interface and pushing
 * them into BUILTIN_VALIDATORS, or by importing `runFleetValidation` and passing
 * `extraValidators`.
 *
 * Fleet app discovery (in priority order):
 *   1. --projects=app1,app2          (explicit CLI flag)
 *   2. FLEET_PROJECTS=app1,app2      (env var)
 *   3. Control-plane API             (auto-discover using CONTROL_PLANE_API_KEY)
 *
 * Usage:
 *   npx tsx tools/validate-fleet.ts                                # auto-discover
 *   npx tsx tools/validate-fleet.ts --projects=app1,app2
 *   npx tsx tools/validate-fleet.ts --skip=reachability,drift
 *   npx tsx tools/validate-fleet.ts --only=doppler-required
 *   npx tsx tools/validate-fleet.ts --strict
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveFleetTargets } from './fleet-projects'
import {
  collectManagedTemplateFiles,
  getCanonicalCiContent,
  normalizeManagedContent,
} from './sync-manifest'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface ValidatorContext {
  /** Doppler project name for this app */
  project: string
  /** Lazily-fetched Doppler secrets for prd config (shared across validators) */
  prdSecrets: Record<string, string> | null
  /** Lazily-fetched Doppler secrets for dev config */
  devSecrets: Record<string, string> | null
  /** Absolute path to the template repo root */
  templateRoot: string
}

export interface ValidatorResult {
  /** pass / warn / fail */
  status: 'pass' | 'warn' | 'fail'
  /** Short single-line summary */
  message: string
  /** Extra lines printed when not passing */
  detail?: string[]
}

export interface Validator {
  /** Unique name — used as column header and in --skip/--only */
  name: string
  /** Run the check for one project */
  run: (ctx: ValidatorContext) => Promise<ValidatorResult>
}

// ──────────────────────────────────────────────────────────────
// Shared helpers
// ──────────────────────────────────────────────────────────────

function getDopplerSecrets(project: string, config: string): Record<string, string> | null {
  try {
    const raw = execSync(
      `doppler secrets download --project "${project}" --config ${config} --no-file --format json`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
    )
    return JSON.parse(raw)
  } catch {
    return null
  }
}

// ──────────────────────────────────────────────────────────────
// Built-in validators
// ──────────────────────────────────────────────────────────────

const REQUIRED_SECRETS = [
  'SITE_URL',
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID',
  'GITHUB_TOKEN_PACKAGES_READ',
  'POSTHOG_PUBLIC_KEY',
] as const

const RECOMMENDED_SECRETS = [
  'GA_MEASUREMENT_ID',
  'GA_PROPERTY_ID',
  'GSC_SERVICE_ACCOUNT_JSON',
  'INDEXNOW_KEY',
  'GSC_USER_EMAIL',
  'GA_ACCOUNT_ID',
  'POSTHOG_HOST',
  'POSTHOG_PROJECT_ID',
  'CRON_SECRET',
] as const

/** Keys that should have the same value in both dev and prd (hub-spoke canonical values). */
const HUB_SPOKE_KEYS = [
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID',
  'GITHUB_TOKEN_PACKAGES_READ',
  'POSTHOG_PUBLIC_KEY',
  'POSTHOG_HOST',
  'POSTHOG_PROJECT_ID',
  'GA_ACCOUNT_ID',
  'GSC_SERVICE_ACCOUNT_JSON',
  'GSC_USER_EMAIL',
  'CSP_SCRIPT_SRC',
  'CSP_CONNECT_SRC',
] as const

const dopplerRequired: Validator = {
  name: 'doppler-required',
  async run(ctx) {
    if (!ctx.prdSecrets) return { status: 'fail', message: 'no access' }

    const missing = REQUIRED_SECRETS.filter((s) => !(s in ctx.prdSecrets!))
    if (missing.length === 0) return { status: 'pass', message: 'all present' }

    return {
      status: 'fail',
      message: `missing ${missing.length}`,
      detail: missing.map((s) => `  MISSING: ${s}`),
    }
  },
}

const dopplerRecommended: Validator = {
  name: 'doppler-recommended',
  async run(ctx) {
    if (!ctx.prdSecrets) return { status: 'fail', message: 'no access' }

    const missing = RECOMMENDED_SECRETS.filter((s) => !(s in ctx.prdSecrets!))
    if (missing.length === 0) return { status: 'pass', message: 'all present' }

    return {
      status: 'warn',
      message: `missing ${missing.length}`,
      detail: missing.map((s) => `  optional: ${s}`),
    }
  },
}

const dopplerHubSync: Validator = {
  name: 'doppler-hub-sync',
  async run(ctx) {
    const prd = ctx.prdSecrets
    const dev = ctx.devSecrets
    if (!prd || !dev) return { status: 'fail', message: 'no access (prd or dev)' }

    const outOfSync: string[] = []
    for (const key of HUB_SPOKE_KEYS) {
      const prdVal = prd[key]
      const devVal = dev[key]
      // Only flag if both exist but differ
      if (prdVal && devVal && prdVal !== devVal) {
        outOfSync.push(key)
      }
    }

    if (outOfSync.length === 0) return { status: 'pass', message: 'prd == dev' }

    return {
      status: 'fail',
      message: `${outOfSync.length} key(s) differ`,
      detail: outOfSync.map((k) => `  DRIFT: ${k} (prd ≠ dev)`),
    }
  },
}

const drift: Validator = {
  name: 'drift',
  async run(ctx) {
    // We need a local checkout of the fleet app to compare files.
    // For fleet-wide runs from the template, we check if the app has a local
    // clone at ../template-apps/<project> or the user configured a FLEET_APPS_DIR.
    const appsDir = process.env.FLEET_APPS_DIR || `${ctx.templateRoot}/../template-apps`
    const appRoot = `${appsDir}/${ctx.project}`

    try {
      execSync(`test -d "${appRoot}"`, { stdio: 'pipe' })
    } catch {
      return {
        status: 'warn',
        message: 'no local clone',
        detail: [`  App dir not found: ${appRoot}`],
      }
    }

    const managedFiles = collectManagedTemplateFiles(ctx.templateRoot)
    let drifted = 0
    let matched = 0
    const driftedFiles: string[] = []

    for (const file of managedFiles) {
      const templatePath = join(ctx.templateRoot, file)
      const appPath = join(appRoot, file)
      const templateContent =
        file === '.github/workflows/ci.yml'
          ? getCanonicalCiContent()
          : existsSync(templatePath)
            ? readFileSync(templatePath, 'utf-8')
            : null

      if (templateContent === null) {
        continue
      }

      if (!existsSync(appPath)) {
        drifted++
        driftedFiles.push(`  MISSING: ${file}`)
        continue
      }

      const appContent = readFileSync(appPath, 'utf-8')
      if (
        normalizeManagedContent(file, appContent) !== normalizeManagedContent(file, templateContent)
      ) {
        drifted++
        driftedFiles.push(`  DRIFTED: ${file}`)
      } else {
        matched++
      }
    }

    if (drifted === 0) return { status: 'pass', message: `${matched}/${matched} match` }

    return {
      status: 'fail',
      message: `${drifted} file(s) drifted`,
      detail: driftedFiles,
    }
  },
}

const reachability: Validator = {
  name: 'reachability',
  async run(ctx) {
    const prd = ctx.prdSecrets
    const siteUrl = prd?.SITE_URL
    if (!siteUrl) return { status: 'warn', message: 'no SITE_URL' }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10_000)
      const start = Date.now()
      const res = await fetch(siteUrl, {
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': 'NardukFleetValidator/1.0' },
      })
      clearTimeout(timeout)
      const ms = Date.now() - start

      if (res.ok) return { status: 'pass', message: `${res.status} (${ms}ms)` }
      return { status: 'fail', message: `HTTP ${res.status} (${ms}ms)` }
    } catch {
      return { status: 'fail', message: 'timeout / unreachable' }
    }
  },
}

const gitRemote: Validator = {
  name: 'git-remote',
  async run(ctx) {
    const appsDir = process.env.FLEET_APPS_DIR || `${ctx.templateRoot}/../template-apps`
    const appRoot = `${appsDir}/${ctx.project}`

    try {
      execSync(`test -d "${appRoot}/.git"`, { stdio: 'pipe' })
    } catch {
      return { status: 'warn', message: 'no local clone' }
    }

    const issues: string[] = []

    // Check origin URL matches expected pattern
    try {
      const originUrl = execSync(`git -C "${appRoot}" remote get-url origin`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim()

      const expectedPatterns = [
        `git@github.com:narduk-enterprises/${ctx.project}.git`,
        `https://github.com/narduk-enterprises/${ctx.project}.git`,
      ]
      if (!expectedPatterns.includes(originUrl)) {
        issues.push(`  ORIGIN: ${originUrl} (expected narduk-enterprises/${ctx.project})`)
      }
    } catch {
      issues.push('  ORIGIN: could not read remote URL')
    }

    // Check for stale remote refs that block fetch/pull
    try {
      const pruneOutput = execSync(`git -C "${appRoot}" remote prune origin --dry-run`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      const staleCount = (pruneOutput.match(/\[would prune\]/g) || []).length
      if (staleCount > 0) {
        issues.push(`  STALE: ${staleCount} remote ref(s) need pruning`)
      }
    } catch {
      /* ignore */
    }

    if (issues.length === 0) return { status: 'pass', message: 'ok' }
    return { status: 'fail', message: `${issues.length} issue(s)`, detail: issues }
  },
}

const layerFreshness: Validator = {
  name: 'layer-fresh',
  async run(ctx) {
    const appsDir = process.env.FLEET_APPS_DIR || `${ctx.templateRoot}/../template-apps`
    const appRoot = `${appsDir}/${ctx.project}`
    const secHeaders = `${appRoot}/layers/narduk-nuxt-layer/server/middleware/securityHeaders.ts`

    try {
      const content = execSync(`cat "${secHeaders}"`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      const lines = content.split('\n').length
      const hasDynamic = content.includes('cspScriptSrc') || content.includes('posthogHost')

      if (hasDynamic) return { status: 'pass', message: `dynamic (${lines} lines)` }
      return {
        status: 'fail',
        message: `hardcoded (${lines} lines)`,
        detail: ['  securityHeaders.ts is outdated — run: pnpm run update-layer'],
      }
    } catch {
      return { status: 'warn', message: 'no local clone' }
    }
  },
}

const shipScript: Validator = {
  name: 'ship-script',
  async run(ctx) {
    const appsDir = process.env.FLEET_APPS_DIR || `${ctx.templateRoot}/../template-apps`
    const pkgPath = `${appsDir}/${ctx.project}/package.json`

    try {
      const content = execSync(`cat "${pkgPath}"`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      const pkg = JSON.parse(content)
      const missing: string[] = []
      if (!pkg.scripts?.ship) missing.push('ship')
      if (!pkg.scripts?.preship) missing.push('preship')

      if (missing.length === 0) return { status: 'pass', message: 'present' }
      return {
        status: 'fail',
        message: `missing: ${missing.join(', ')}`,
        detail: ['  Run sync-template to add ship/preship scripts'],
      }
    } catch {
      return { status: 'warn', message: 'no local clone' }
    }
  },
}

const syncHealth: Validator = {
  name: 'sync-health',
  async run(ctx) {
    const appsDir = process.env.FLEET_APPS_DIR || `${ctx.templateRoot}/../template-apps`
    const appRoot = `${appsDir}/${ctx.project}`

    try {
      execSync(`test -d "${appRoot}"`, { stdio: 'pipe' })
    } catch {
      return { status: 'warn', message: 'no local clone' }
    }

    try {
      execSync(`pnpm exec tsx tools/check-sync-health.ts --root="${appRoot}"`, {
        cwd: ctx.templateRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      return { status: 'pass', message: 'clean' }
    } catch (error) {
      const detail =
        error instanceof Error && 'stdout' in error
          ? String((error as { stdout?: string }).stdout || '').trim()
          : ''

      return {
        status: 'fail',
        message: 'failed',
        detail: detail
          ? detail
              .split('\n')
              .slice(-8)
              .map((line) => `  ${line}`)
          : ['  Run `pnpm exec tsx tools/check-sync-health.ts` in the app clone.'],
      }
    }
  },
}

/** All built-in validators, in display order. */
const BUILTIN_VALIDATORS: Validator[] = [
  dopplerRequired,
  dopplerRecommended,
  dopplerHubSync,
  drift,
  reachability,
  gitRemote,
  layerFreshness,
  shipScript,
  syncHealth,
]

// ──────────────────────────────────────────────────────────────
// Runner & output
// ──────────────────────────────────────────────────────────────

interface RunOptions {
  projects: string[]
  validators?: Validator[]
  extraValidators?: Validator[]
  skip?: string[]
  only?: string[]
  strict?: boolean
  templateRoot?: string
}

export async function runFleetValidation(opts: RunOptions) {
  const templateRoot = opts.templateRoot || process.cwd()
  let validators = opts.validators || [...BUILTIN_VALIDATORS]

  if (opts.extraValidators) {
    validators = [...validators, ...opts.extraValidators]
  }

  if (opts.only && opts.only.length > 0) {
    const onlySet = new Set(opts.only)
    validators = validators.filter((v) => onlySet.has(v.name))
  } else if (opts.skip && opts.skip.length > 0) {
    const skipSet = new Set(opts.skip)
    validators = validators.filter((v) => !skipSet.has(v.name))
  }

  if (validators.length === 0) {
    console.error('❌ No validators selected. Check --only / --skip flags.')
    process.exit(1)
  }

  const { projects } = opts

  console.log('')
  console.log(`Fleet Validation — ${validators.length} validator(s) × ${projects.length} app(s)`)
  console.log('═'.repeat(72))

  // Header row
  const nameCol = 28
  const valColWidth = 20
  const header =
    '  ' + 'App'.padEnd(nameCol) + validators.map((v) => v.name.padEnd(valColWidth)).join('')
  console.log(header)
  console.log('  ' + '─'.repeat(nameCol) + validators.map(() => '─'.repeat(valColWidth)).join(''))

  let totalPass = 0
  let totalWarn = 0
  let totalFail = 0
  const allDetails: string[] = []

  for (const project of projects) {
    // Lazily fetch secrets once per project (shared across validators)
    const prdSecrets = getDopplerSecrets(project, 'prd')
    const devSecrets = getDopplerSecrets(project, 'dev')

    const ctx: ValidatorContext = { project, prdSecrets, devSecrets, templateRoot }
    const cells: string[] = []

    for (const validator of validators) {
      let result: ValidatorResult
      try {
        result = await validator.run(ctx)
      } catch (e: any) {
        result = { status: 'fail', message: `error: ${e.message?.slice(0, 30)}` }
      }

      const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '🟠' : '❌'
      cells.push(`${icon} ${result.message}`.padEnd(valColWidth))

      if (result.status === 'pass') totalPass++
      else if (result.status === 'warn') totalWarn++
      else totalFail++

      if (result.status !== 'pass' && result.detail?.length) {
        allDetails.push(`\n  📋 ${project} → ${validator.name}:`)
        allDetails.push(...result.detail)
      }
    }

    console.log('  ' + project.padEnd(nameCol) + cells.join(''))
  }

  console.log('═'.repeat(72))

  // Detail section
  if (allDetails.length > 0) {
    console.log('\nDetails:')
    for (const line of allDetails) console.log(line)
  }

  // Summary
  const total = totalPass + totalWarn + totalFail
  console.log('')
  console.log(
    `  Checks: ${total} total — ${totalPass} passed, ${totalWarn} warned, ${totalFail} failed`,
  )

  if (totalFail === 0 && totalWarn === 0) {
    console.log('  ✅ All fleet validation checks passed!')
  } else if (totalFail === 0) {
    console.log('  🟠 Passed with warnings.')
  } else {
    console.log('  ❌ Some checks failed. Review details above.')
  }
  console.log('')

  if (opts.strict && totalFail > 0) {
    process.exit(1)
  }
}

// ──────────────────────────────────────────────────────────────
// CLI entrypoint
// ──────────────────────────────────────────────────────────────

async function parseCli() {
  const args = process.argv.slice(2)

  const projectsArg = args.find((a) => a.startsWith('--projects='))?.slice('--projects='.length)

  const skip =
    args
      .find((a) => a.startsWith('--skip='))
      ?.slice('--skip='.length)
      ?.split(',') ?? []
  const only =
    args
      .find((a) => a.startsWith('--only='))
      ?.slice('--only='.length)
      ?.split(',') ?? []
  const strict = args.includes('--strict')
  const { repos: projects } = await resolveFleetTargets({
    explicit: projectsArg
      ? projectsArg
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      : [],
    envValue: process.env.FLEET_PROJECTS,
    log: (message) => console.error(message),
  })

  return { projects, skip, only, strict }
}

// Only run CLI when executed directly (not imported)
const isDirectRun = process.argv[1]?.includes('validate-fleet')
if (isDirectRun) {
  parseCli()
    .then(({ projects, skip, only, strict }) =>
      runFleetValidation({
        projects,
        skip,
        only,
        strict,
        templateRoot: fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, ''),
      }),
    )
    .catch((e) => {
      console.error('Fleet validation failed:', e.message)
      process.exit(1)
    })
}
