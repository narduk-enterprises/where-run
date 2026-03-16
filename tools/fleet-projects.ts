import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

interface FleetApp {
  dopplerProject?: string
}

interface FleetManifest {
  repos?: unknown
}

export interface ResolveFleetTargetsOptions {
  explicit?: string[]
  envValue?: string
  exclude?: Iterable<string>
  fromRepo?: string | null
  log?: (message: string) => void
}

export interface ResolveFleetTargetsResult {
  repos: string[]
  source: 'explicit' | 'env' | 'control-plane' | 'manifest'
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..')
const MANIFEST_PATH = join(ROOT_DIR, 'config', 'fleet-sync-repos.json')

export function parseCommaSeparated(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function loadManifestFleetRepos(): string[] {
  if (!existsSync(MANIFEST_PATH)) return []

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as FleetManifest
  if (!Array.isArray(manifest.repos) || manifest.repos.some((repo) => typeof repo !== 'string')) {
    throw new Error(`Invalid fleet manifest: ${MANIFEST_PATH}`)
  }

  return [...new Set(manifest.repos)]
}

function getControlPlaneApiKey(): string | null {
  if (process.env.CONTROL_PLANE_API_KEY?.startsWith('nk_')) {
    return process.env.CONTROL_PLANE_API_KEY
  }

  try {
    const raw = execSync(
      'doppler secrets get CONTROL_PLANE_API_KEY --project where-run --config prd --plain',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
    ).trim()

    if (raw.startsWith('nk_')) {
      process.env.CONTROL_PLANE_API_KEY = raw
      return raw
    }
  } catch {
    /* fall through */
  }

  return null
}

export async function discoverFleetProjectsFromControlPlane(
  log?: (message: string) => void,
): Promise<string[]> {
  const apiKey = getControlPlaneApiKey()
  if (!apiKey) return []

  const baseUrl = process.env.CONTROL_PLANE_URL || 'https://control-plane.nard.uk'

  try {
    const response = await fetch(`${baseUrl}/api/fleet/apps`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!response.ok) {
      log?.(`⚠️  Control plane API returned ${response.status}. Falling back to manifest.`)
      return []
    }

    const apps = (await response.json()) as FleetApp[]
    return apps
      .map((app) => app.dopplerProject?.trim() || '')
      .filter(Boolean)
      .sort()
  } catch (error: any) {
    log?.(`⚠️  Failed to reach control plane: ${error.message}. Falling back to manifest.`)
    return []
  }
}

export async function resolveFleetTargets(
  options: ResolveFleetTargetsOptions = {},
): Promise<ResolveFleetTargetsResult> {
  const explicit = options.explicit?.filter(Boolean) ?? []
  const envRepos = parseCommaSeparated(options.envValue)

  let repos: string[] = []
  let source: ResolveFleetTargetsResult['source'] = 'manifest'

  if (explicit.length > 0) {
    repos = [...new Set(explicit)]
    source = 'explicit'
  } else if (envRepos.length > 0) {
    repos = [...new Set(envRepos)]
    source = 'env'
  } else {
    repos = await discoverFleetProjectsFromControlPlane(options.log)
    if (repos.length > 0) {
      source = 'control-plane'
    } else {
      repos = loadManifestFleetRepos()
      source = 'manifest'
    }
  }

  const exclude = new Set(options.exclude ?? [])
  let filtered = repos.filter((repo) => !exclude.has(repo))

  if (options.fromRepo) {
    const startIndex = filtered.indexOf(options.fromRepo)
    if (startIndex === -1) {
      throw new Error(`--from repo not found in target set: ${options.fromRepo}`)
    }
    filtered = filtered.slice(startIndex)
  }

  if (filtered.length === 0) {
    throw new Error('No fleet repos selected.')
  }

  return {
    repos: filtered,
    source,
  }
}
