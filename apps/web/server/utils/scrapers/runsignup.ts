/**
 * RunSignUp API Client
 *
 * Fetches upcoming running races from the RunSignUp public REST API.
 * API docs: https://runsignup.com/API
 *
 * No authentication required. Returns JSON race data.
 */

import type { NewRace } from '#server/database/schema'

const API_BASE = 'https://runsignup.com/Rest/races'

interface RunSignUpRace {
  race_id: number
  name: string
  next_date?: string
  last_date?: string
  address?: {
    city?: string
    state?: string
    zipcode?: string
    street?: string
    country_code?: string
  }
  latitude?: number
  longitude?: number
  url?: string
  external_race_url?: string
  description?: string
  logo_url?: string
  is_virtual?: string
  events?: Array<{
    event_id: number
    name: string
    distance?: number
    distance_units?: string
    start_time?: string
  }>
}

interface RunSignUpResponse {
  races: Array<{ race: RunSignUpRace }>
  total_results: number
}

/** Map distance to race type */
function classifyRaceType(distanceMeters: number | null): string {
  if (!distanceMeters) return 'other'
  if (distanceMeters <= 5200) return '5k'
  if (distanceMeters <= 10500) return '10k'
  if (distanceMeters <= 22000) return 'half'
  if (distanceMeters <= 43000) return 'marathon'
  if (distanceMeters > 43000) return 'ultra'
  return 'other'
}

/** Generate a URL-safe slug from race name, city, state, and date */
function generateSlug(name: string, city: string, state: string, date: string): string {
  const raw = `${name}-${city}-${state}-${date}`
  return raw
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s-]/g, '')
    .replaceAll(/\s+/g, '-')
    .replaceAll(/-+/g, '-')
    .slice(0, 120) // keep slugs reasonable length
}

/** Convert RunSignUp distance + units to meters */
function toMeters(distance?: number, units?: string): number | null {
  if (!distance) return null
  switch (units?.toLowerCase()) {
    case 'mi':
    case 'miles':
      return Math.round(distance * 1609.344)
    case 'km':
    case 'kilometers':
      return Math.round(distance * 1000)
    case 'm':
    case 'meters':
      return Math.round(distance)
    default:
      // Assume miles if no units (common for US races)
      return Math.round(distance * 1609.344)
  }
}

/** Normalize a RunSignUp race into our schema */
function normalizeRace(raw: RunSignUpRace): NewRace | null {
  const date = raw.next_date || raw.last_date
  if (!date) return null

  const city = raw.address?.city || 'Unknown'
  const state = raw.address?.state || ''

  // Skip non-US races
  if (raw.address?.country_code && raw.address.country_code !== 'US') return null
  if (!state) return null

  const lat = raw.latitude ?? 0
  const lng = raw.longitude ?? 0

  // Get primary event distance
  const primaryEvent = raw.events?.[0]
  const distanceMeters = toMeters(primaryEvent?.distance, primaryEvent?.distance_units)
  const raceType = classifyRaceType(distanceMeters)

  const now = new Date().toISOString()

  return {
    id: `runsignup_${raw.race_id}`,
    slug: generateSlug(raw.name, city, state, date),
    name: raw.name,
    date,
    city,
    state,
    latitude: lat,
    longitude: lng,
    distanceMeters,
    raceType,
    url: raw.external_race_url || raw.url || null,
    registrationUrl: raw.url ? `https://runsignup.com/Race/${raw.race_id}` : null,
    description: raw.description?.slice(0, 2000) || null, // Truncate long descriptions
    logoUrl: raw.logo_url || null,
    source: 'runsignup',
    sourceId: String(raw.race_id),
    participantCount: null,
    isVirtual: raw.is_virtual === 'T' ? 1 : 0,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Fetch upcoming races from RunSignUp API.
 * Supports pagination and geographic filtering by state.
 */
export async function fetchRunSignUpRaces(options: {
  state?: string
  page?: number
  resultsPerPage?: number
  startDate?: string
  endDate?: string
}): Promise<{ races: NewRace[]; totalResults: number }> {
  const {
    state,
    page = 1,
    resultsPerPage = 50,
    startDate,
    endDate,
  } = options

  const params = new URLSearchParams({
    format: 'json',
    api_version: '2',
    api_key: 'demo',
    events: 'T',
    page: String(page),
    results_per_page: String(resultsPerPage),
    sort: 'date+ASC',
    only_partner_races: 'F',
    include_waiver: 'F',
    include_event_days: 'F',
    country: 'US',
  })

  if (state) params.set('state', state)
  if (startDate) params.set('start_date', startDate)
  if (endDate) params.set('end_date', endDate)

  const url = `${API_BASE}?${params.toString()}`

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'WhereRun/1.0 (https://where-run.nard.uk)',
    },
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    throw new Error(`RunSignUp API error: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as RunSignUpResponse

  const normalized = (data.races || [])
    .map((r) => normalizeRace(r.race))
    .filter((r): r is NewRace => r !== null)

  return {
    races: normalized,
    totalResults: data.total_results || 0,
  }
}

/** US states to scrape — we cycle through them */
export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC',
]
