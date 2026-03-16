/**
 * Active.com Activity Search API v2 Client
 *
 * Fetches upcoming running races from the Active.com public search API.
 * API docs: https://developer.active.com/docs
 *
 * Free tier: 10,000 calls/day once registered for an API key.
 * Falls back to no-key mode (lower limits) if key not provided.
 */

import type { NewRace } from '#server/database/schema'
import { generateSlug, generateDedupeKey } from './types'

const API_BASE = 'http://api.amp.active.com/v2/search'

interface ActiveComAsset {
  assetGuid: string
  assetName: string
  assetDescription?: string
  activityStartDate?: string
  activityEndDate?: string
  registrationUrlAdr?: string
  homePageUrlAdr?: string
  logoUrlAdr?: string
  place?: {
    cityName?: string
    stateProvinceCode?: string
    countryCode?: string
    postalCode?: string
    latitude?: number
    longitude?: number
    addressLine1Txt?: string
  }
  assetCategories?: Array<{
    category: {
      categoryName: string
      categoryTaxonomy: string
    }
  }>
  assetTags?: Array<{
    tag: { tagName: string }
  }>
}

interface ActiveComResponse {
  total_results: number
  results: ActiveComAsset[]
}

/** Classify race type from Active.com asset name and tags */
function classifyFromName(name: string, tags: string[]): string {
  const combined = (name + ' ' + tags.join(' ')).toLowerCase()
  if (
    combined.includes('ultra') ||
    combined.includes('100mi') ||
    combined.includes('50mi') ||
    combined.includes('100k') ||
    combined.includes('50k')
  )
    return 'ultra'
  if (combined.includes('trail')) return 'trail'
  if (combined.includes('marathon') && !combined.includes('half')) return 'marathon'
  if (
    combined.includes('half marathon') ||
    combined.includes('half-marathon') ||
    combined.includes('13.1')
  )
    return 'half'
  if (combined.includes('10k') || combined.includes('10 k')) return '10k'
  if (combined.includes('5k') || combined.includes('5 k') || combined.includes('fun run'))
    return '5k'
  return 'other'
}

/** Normalize an Active.com asset into our Race schema */
function normalizeAsset(asset: ActiveComAsset): NewRace | null {
  const date = asset.activityStartDate?.split('T')[0]
  if (!date) return null

  const city = asset.place?.cityName || ''
  const state = asset.place?.stateProvinceCode || ''
  if (!city || !state) return null
  if (asset.place?.countryCode && asset.place.countryCode !== 'US') return null

  const lat = asset.place?.latitude ?? 0
  const lng = asset.place?.longitude ?? 0
  const tags = (asset.assetTags || []).map((t) => t.tag.tagName)
  const raceType = classifyFromName(asset.assetName, tags)

  const now = new Date().toISOString()

  // Strip HTML from description
  const description =
    asset.assetDescription
      ?.replaceAll(/<[^>]*>/g, '')
      ?.replaceAll('&nbsp;', ' ')
      ?.replaceAll('&amp;', '&')
      ?.slice(0, 2000) || null

  return {
    id: `active_${asset.assetGuid}`,
    slug: generateSlug(asset.assetName, city, state, date),
    name: asset.assetName,
    date,
    endDate: asset.activityEndDate?.split('T')[0] || null,
    city,
    state,
    latitude: lat,
    longitude: lng,
    distanceMeters: null,
    raceType,
    url: asset.homePageUrlAdr || null,
    registrationUrl: asset.registrationUrlAdr || null,
    description,
    logoUrl: asset.logoUrlAdr || null,
    source: 'active',
    sourceId: asset.assetGuid,
    dedupeKey: generateDedupeKey(asset.assetName, date, state),
    participantCount: null,
    isVirtual: 0,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Fetch running races from Active.com Activity Search API.
 */
export async function fetchActiveComRaces(options: {
  state?: string
  page?: number
  resultsPerPage?: number
  startDate?: string
  endDate?: string
  apiKey?: string
}): Promise<{ races: NewRace[]; totalResults: number; hasMore: boolean }> {
  const { state, page = 1, resultsPerPage = 50, startDate, endDate, apiKey } = options

  const params = new URLSearchParams({
    query: 'running OR marathon OR 5K OR 10K OR trail run OR half marathon',
    category: 'event',
    topic: 'Running',
    per_page: String(resultsPerPage),
    current_page: String(page),
    sort: 'date_asc',
    country: 'United+States',
  })

  if (state) params.set('near', `${state}, US`)
  if (startDate) params.set('start_date', `${startDate}..${endDate || ''}`)
  if (apiKey) params.set('api_key', apiKey)

  const url = `${API_BASE}?${params.toString()}`

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'WhereRun/1.0 (https://where-run.nard.uk)',
    },
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    throw new Error(`Active.com API error: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as ActiveComResponse

  const normalized = (data.results || [])
    .map((asset) => normalizeAsset(asset))
    .filter((r): r is NewRace => r !== null)

  return {
    races: normalized,
    totalResults: data.total_results || 0,
    hasMore: page * resultsPerPage < (data.total_results || 0),
  }
}
