/**
 * Template Drift Detection — Compares an app's infrastructure files against
 * the canonical where-run and reports files that have drifted.
 *
 * Usage:
 *   tsx .agents/app-standardization/check-template-drift.ts <app-dir>
 *   tsx .agents/app-standardization/check-template-drift.ts ~/new-code/neon-sewer-raid
 *
 * Requirements:
 *   - Both the app and ~/new-code/where-run must exist
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

// ─── Configuration ──────────────────────────────────────────

const TEMPLATE_DIR = join(process.env.HOME || '~', 'new-code', 'where-run')

/**
 * Critical infrastructure files that MUST match the template.
 * If these drift, the app's build/deploy/quality pipeline may break.
 * Paths are relative to the repo root.
 */
const CRITICAL_FILES = [
  // CI/CD
  '.github/workflows/ci.yml',
  '.github/workflows/version-bump.yml',

  // Tooling
  'tools/init.ts',
  'tools/setup-analytics.ts',
  'tools/gsc-toolbox.ts',
  'tools/validate.ts',
  'tools/update-layer.ts',
  'tools/generate-favicons.ts',

  // ESLint shared config
  'packages/eslint-config/eslint.config.mjs',
  'packages/eslint-config/package.json',
  'packages/eslint-config/eslint-plugins/index.mjs',

  // Root scaffolding
  '.gitignore',
  'turbo.json',
  'pnpm-workspace.yaml',
  '.github/copilot-instructions.md',

  // Agent infrastructure
  'AGENTS.md',
  '.agents/workflows/check-architecture.md',
  '.agents/workflows/check-data-fetching.md',
  '.agents/workflows/check-plugin-lifecycle.md',
  '.agents/workflows/check-seo-compliance.md',
  '.agents/workflows/check-ssr-hydration-safety.md',
  '.agents/workflows/check-ui-styling.md',
  '.agents/workflows/deploy.md',
  // '.agents/workflows/audit-init-flow.md', // TODO: create this workflow
  '.agents/workflows/audit-repo-hygiene.md',
  '.agents/workflows/check-layer-health.md',
  '.agents/workflows/review-cloudflare-layer.md',
  '.agents/workflows/review-doppler-pattern.md',
  '.agents/workflows/score-repo.md',
  '.agents/workflows/generate-app-idea.md',
  '.agents/workflows/generate-brand-identity.md',
  '.agents/workflows/migrate-local.md',
]

/**
 * Files that are expected to differ per-app (never flagged as drift).
 */
const IGNORE_PATTERNS = [
  'apps/web/app/', // All app code
  'apps/web/server/', // App server code
  'apps/web/content/', // App content
  'apps/web/public/', // App assets (favicon, icons)
  'apps/web/nuxt.config.ts', // App-specific config
  'apps/web/package.json', // App-specific deps
  'apps/web/wrangler.json', // App-specific CF config
  'apps/web/app.config.ts', // App-specific theme
  'README.md', // App README
  'package.json', // Root package.json (name differs)
  'pnpm-lock.yaml', // Lock file always differs
]

// ─── Helpers ────────────────────────────────────────────────

function filesIdentical(fileA: string, fileB: string): boolean {
  try {
    const a = readFileSync(fileA)
    const b = readFileSync(fileB)
    return a.equals(b)
  } catch {
    return false
  }
}

// ─── Main ───────────────────────────────────────────────────

function main() {
  const appDir = process.argv[2]
  if (!appDir) {
    console.error('Usage: tsx check-template-drift.ts <app-directory>')
    console.error('  e.g: tsx check-template-drift.ts ~/new-code/neon-sewer-raid')
    process.exit(1)
  }

  const resolvedApp = appDir.replace(/^~/, process.env.HOME || '')
  const appName = resolvedApp.split('/').pop() || 'unknown'

  if (!existsSync(resolvedApp)) {
    console.error(`❌ App directory not found: ${resolvedApp}`)
    process.exit(1)
  }
  if (!existsSync(TEMPLATE_DIR)) {
    console.error(`❌ Template directory not found: ${TEMPLATE_DIR}`)
    process.exit(1)
  }

  console.log()
  console.log(`Template Drift Report: ${appName}`)
  console.log(`═══════════════════════════════════════════════════════════════`)
  console.log(`  App:      ${resolvedApp}`)
  console.log(`  Template: ${TEMPLATE_DIR}`)
  console.log()

  const drifted: string[] = []
  const missing: string[] = []
  const matched: string[] = []

  for (const file of CRITICAL_FILES) {
    const appFile = join(resolvedApp, file)
    const templateFile = join(TEMPLATE_DIR, file)

    if (!existsSync(templateFile)) {
      // Template doesn't have this file (shouldn't happen, but skip)
      continue
    }

    if (!existsSync(appFile)) {
      missing.push(file)
    } else if (!filesIdentical(appFile, templateFile)) {
      drifted.push(file)
    } else {
      matched.push(file)
    }
  }

  // Also check for files that should NOT exist in derived apps
  const shouldNotExist = [
    '.github/workflows/publish-layer.yml',
    '.github/workflows/deploy-showcase.yml',
    '.github/workflows/deploy.yml', // Old separate deploy
    'tools/eslint-plugin-vue-official-best-practices', // Moved to packages/
    'tools/init_new.ts', // Migration leftover
  ]
  const stale: string[] = []
  for (const file of shouldNotExist) {
    if (existsSync(join(resolvedApp, file))) {
      stale.push(file)
    }
  }

  // ─── Report ─────────────────────────────────────────────

  if (matched.length > 0) {
    console.log(` ✅ Up to date (${matched.length} files):`)
    for (const f of matched) {
      console.log(`    ${f}`)
    }
    console.log()
  }

  if (drifted.length > 0) {
    console.log(` ❌ DRIFTED (${drifted.length} files — need sync from template):`)
    for (const f of drifted) {
      console.log(`    ${f}`)
    }
    console.log()
    console.log('   To fix drifted files:')
    for (const f of drifted) {
      console.log(`     cp "${join(TEMPLATE_DIR, f)}" "${join(resolvedApp, f)}"`)
    }
    console.log()
  }

  if (missing.length > 0) {
    console.log(` ⚠️  MISSING (${missing.length} files — need copy from template):`)
    for (const f of missing) {
      console.log(`    ${f}`)
    }
    console.log()
    console.log('   To add missing files:')
    for (const f of missing) {
      console.log(`     cp "${join(TEMPLATE_DIR, f)}" "${join(resolvedApp, f)}"`)
    }
    console.log()
  }

  if (stale.length > 0) {
    console.log(` 🗑  STALE (${stale.length} files — should be deleted):`)
    for (const f of stale) {
      console.log(`    ${f}`)
    }
    console.log()
    console.log('   To clean up:')
    for (const f of stale) {
      console.log(`     rm -rf "${join(resolvedApp, f)}"`)
    }
    console.log()
  }

  // ─── Summary ────────────────────────────────────────────

  console.log('═══════════════════════════════════════════════════════════════')
  const total = CRITICAL_FILES.length
  console.log(` Score: ${matched.length}/${total} files match template`)
  if (drifted.length === 0 && missing.length === 0 && stale.length === 0) {
    console.log(' ✅ All infrastructure files are in sync!')
  } else {
    console.log(` ❌ ${drifted.length} drifted, ${missing.length} missing, ${stale.length} stale`)
  }
  console.log()
}

main()
