/**
 * Check that all fleet apps are reachable (and optionally report build version/time).
 *
 * Usage:
 *   npx tsx tools/check-apps-reachable.ts --urls=./fleet-urls.json
 *   npx tsx tools/check-apps-reachable.ts --projects=app1,app2
 *   npx tsx tools/check-apps-reachable.ts --timeout=15
 *
 * With --urls=path: JSON file with { "app-name": "https://..." } or [ "https://...", ... ].
 * With --projects=list: comma-separated Doppler project names; SITE_URL is read from each prd config.
 *
 * Fleet membership is driven by the control-plane D1 registry — this script does NOT
 * maintain a hardcoded list of app names. Use --urls= or --projects= to specify targets.
 */

import { execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const args = process.argv.slice(2)
const urlListPath = args.find((a) => a.startsWith('--urls='))?.slice('--urls='.length)
const projectsArg = args.find((a) => a.startsWith('--projects='))?.slice('--projects='.length)
const timeoutSec =
  Number(args.find((a) => a.startsWith('--timeout='))?.slice('--timeout='.length) || '10') * 1000

const FLEET_PROJECTS: string[] = projectsArg
  ? projectsArg
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : []

function isDopplerAvailable(): boolean {
  try {
    execSync('doppler --version', { encoding: 'utf-8', stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

function getDopplerSiteUrl(project: string): string | null {
  try {
    const out = execSync(
      `doppler secrets get SITE_URL --project "${project}" --config prd --plain 2>/dev/null`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
    )
    const url = out.trim()
    return url && url.startsWith('http') ? url : null
  } catch {
    return null
  }
}

function loadUrlsFromFile(path: string): Record<string, string> {
  const abs = resolve(process.cwd(), path)
  if (!existsSync(abs)) {
    console.error(`File not found: ${abs}`)
    process.exit(1)
  }
  const raw = readFileSync(abs, 'utf-8')
  const data = JSON.parse(raw) as Record<string, string> | string[]
  if (Array.isArray(data)) {
    return Object.fromEntries(data.map((url, i) => [`app-${i}`, url]))
  }
  return data
}

async function fetchWithTimeout(
  url: string,
  ms: number,
): Promise<{
  ok: boolean
  status: number
  duration: number
  buildVersion?: string
  buildTime?: string
}> {
  const start = Date.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ms)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'NardukFleetReachabilityCheck/1.0' },
    })
    const duration = Date.now() - start
    clearTimeout(timeout)
    let buildVersion: string | undefined
    let buildTime: string | undefined
    if (res.ok) {
      const html = await res.text()
      const versionMatch = html.match(/<meta\s+name="build-version"\s+content="([^"]*)"/i)
      const timeMatch = html.match(/<meta\s+name="build-time"\s+content="([^"]*)"/i)
      if (versionMatch) buildVersion = versionMatch[1]
      if (timeMatch) buildTime = timeMatch[1]
    }
    return { ok: res.ok, status: res.status, duration, buildVersion, buildTime }
  } catch (e) {
    clearTimeout(timeout)
    const duration = Date.now() - start
    const ok = false
    const status = (e as { cause?: { code?: string } })?.cause?.code === 'ABORT_ERR' ? 0 : -1
    return { ok, status, duration }
  }
}

async function main() {
  let entries: [string, string][]

  if (urlListPath) {
    const obj = loadUrlsFromFile(urlListPath)
    entries = Object.entries(obj)
  } else if (FLEET_PROJECTS.length > 0 && isDopplerAvailable()) {
    entries = FLEET_PROJECTS.map((name) => [name, getDopplerSiteUrl(name) ?? '']).filter(
      (e): e is [string, string] => !!e[1],
    )
    if (entries.length === 0) {
      console.error(
        'No SITE_URL found for any of the specified Doppler projects. Check Doppler CLI auth and prd config.',
      )
      process.exit(1)
    }
  } else {
    console.error('No targets specified.')
    console.error('  Provide --urls=./fleet-urls.json  (JSON map of app-name → URL)')
    console.error(
      '  or      --projects=app1,app2      (Doppler project names; reads SITE_URL from prd)',
    )
    process.exit(1)
  }

  console.log('')
  console.log('Fleet reachability check')
  console.log('────────────────────────')
  const results: {
    name: string
    url: string
    ok: boolean
    status: number
    duration: number
    buildVersion?: string
    buildTime?: string
  }[] = []

  for (const [name, url] of entries) {
    const r = await fetchWithTimeout(url, timeoutSec)
    results.push({
      name,
      url,
      ok: r.ok,
      status: r.status,
      duration: r.duration,
      buildVersion: r.buildVersion,
      buildTime: r.buildTime,
    })
    const status = r.ok ? `✅ ${r.status}` : `❌ ${r.status || 'timeout'}`
    const extra = r.buildTime ? `  build: ${r.buildTime}` : ''
    console.log(`${status}  ${name.padEnd(28)}  ${r.duration}ms  ${url}${extra}`)
  }

  console.log('────────────────────────')
  const failed = results.filter((r) => !r.ok)
  if (failed.length > 0) {
    console.log(`Failed: ${failed.length}/${results.length}`)
    process.exit(1)
  }
  console.log(`All ${results.length} apps reachable.`)
  console.log('')
}

main()
