/**
 * RunSignUp HTML Scraper — No API Key Required
 *
 * Scrapes the public RunSignUp "Find a Race" pages directly.
 * Each page contains ~30 race tiles with structured HTML:
 *
 *   <a href="/Race/TX/City/Name?..." class="rsuTileGrid__item rsuTileGrid__item--findRace">
 *     <div class="rsuTileGrid__item__content ...">
 *       <div class="fs-md-2">Race Name</div>
 *       <div>Day M/DD/YY</div>
 *       <div>City, ST</div>
 *       <div class="d-flex flex-wrap gap05">
 *         <span class="rsuVitamin rsuVitamin--mediumGray">5K</span>
 *       </div>
 *     </div>
 *   </a>
 *
 * Pagination: ?page=2, ?page=3, etc.
 */

import type { NewRace } from '#server/database/schema'
import { generateSlug, generateDedupeKey } from './types'

const BASE_URL = 'https://runsignup.com/Races'

/** Parse "Day M/DD/YY" format to ISO date YYYY-MM-DD */
function parseRSUDate(dateStr: string): string | null {
  // Format: "Mon 3/16/26" → strip day name, parse month/day/year
  const match = dateStr.trim().match(/\d{1,2}\/\d{1,2}\/\d{2,4}/)
  if (!match) return null
  const parts = match[0].split('/')
  if (parts.length !== 3) return null
  const month = parts[0]!.padStart(2, '0')
  const day = parts[1]!.padStart(2, '0')
  let year = parts[2]!
  if (year.length === 2) year = `20${year}`
  return `${year}-${month}-${day}`
}

/** Parse distance strings to meters */
function parseDistanceToMeters(distStr: string): number | null {
  const lower = distStr.trim().toLowerCase()
  // Handle named distances
  if (lower === '5k') return 5000
  if (lower === '10k') return 10000
  if (lower === '1k') return 1000
  if (lower === '50k') return 50000
  if (lower === '100k') return 100000
  // Handle miles
  const miMatch = lower.match(/([\d.]+)\s*(?:mi(?:les?)?|m$)/)
  if (miMatch) {
    const mi = Number.parseFloat(miMatch[1]!)
    if (!Number.isNaN(mi)) return Math.round(mi * 1609.344)
  }
  // Handle meters
  const mMatch = lower.match(/([\d.]+)\s*(?:meters?|m\b)/)
  if (mMatch) {
    const m = Number.parseFloat(mMatch[1]!)
    if (!Number.isNaN(m) && m > 100) return Math.round(m) // Must be > 100 to be meters not miles
  }
  // Handle "X.X Miles"
  const explicitMiles = lower.match(/([\d.]+)\s*miles?/)
  if (explicitMiles) {
    const mi = Number.parseFloat(explicitMiles[1]!)
    if (!Number.isNaN(mi)) return Math.round(mi * 1609.344)
  }
  return null
}

/** Classify race type from distance */
function classifyRaceType(distanceMeters: number | null, distances: string[]): string {
  // Check named distances first
  const combined = distances.join(' ').toLowerCase()
  if (combined.includes('ultra') || combined.includes('100k') || combined.includes('50k') || combined.includes('100 mi')) return 'ultra'
  if (combined.includes('trail')) return 'trail'
  if (combined.includes('marathon') && !combined.includes('half')) return 'marathon'
  if (combined.includes('half marathon') || combined.includes('half-marathon') || combined.includes('13.1')) return 'half'
  // Fall back to distance-based classification
  if (!distanceMeters) return 'other'
  if (distanceMeters <= 5200) return '5k'
  if (distanceMeters <= 10500) return '10k'
  if (distanceMeters <= 22000) return 'half'
  if (distanceMeters <= 43000) return 'marathon'
  if (distanceMeters > 43000) return 'ultra'
  return 'other'
}

/** Extract race tiles from RunSignUp HTML page */
function parseRaceTiles(html: string, state: string): NewRace[] {
  const races: NewRace[] = []
  const now = new Date().toISOString()

  // Split HTML into race tile blocks using the <a> with findRace class
  // Each tile looks like: <a href="/Race/ST/City/Name?..." class="rsuTileGrid__item rsuTileGrid__item--findRace">...</a>
  const tileRegex = /<a\s+href="(\/Race\/[^"]+)"[^>]*rsuTileGrid__item--findRace[^>]*>([\s\S]*?)<\/a>/g
  let tileMatch: RegExpExecArray | null

  while ((tileMatch = tileRegex.exec(html)) !== null) {
    try {
      const raceUrl = tileMatch[1] || ''
      const tileHtml = tileMatch[2] || ''

      // Extract race name from <div class="fs-md-2">Name</div>
      const nameMatch = tileHtml.match(/<div[^>]*class="[^"]*fs-md-2[^"]*"[^>]*>([\s\S]*?)<\/div>/)
      const name = nameMatch?.[1]?.replaceAll(/<[^>]*>/g, '').trim() || ''
      if (!name) continue

      // Extract content divs (name, date, location are sequential divs)
      const contentMatch = tileHtml.match(/rsuTileGrid__item__content[\s\S]*?<div[^>]*class="[^"]*fs-md-2[^"]*"[^>]*>[\s\S]*?<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/)
      const dateStr = contentMatch?.[1]?.replaceAll(/<[^>]*>/g, '').trim() || ''
      const locationStr = contentMatch?.[2]?.replaceAll(/<[^>]*>/g, '').trim() || ''

      const date = parseRSUDate(dateStr)
      if (!date) continue

      // Parse location: "City, ST"
      const locParts = locationStr.split(',').map(s => s.trim())
      const city = locParts[0] || ''
      const stateFromLoc = locParts[1] || state

      // Extract distances from rsuVitamin spans
      const distSpanRegex = /<span[^>]*rsuVitamin[^>]*>([\s\S]*?)<\/span>/g
      const distances: string[] = []
      let distMatch: RegExpExecArray | null
      while ((distMatch = distSpanRegex.exec(tileHtml)) !== null) {
        const dist = distMatch[1]?.replaceAll(/<[^>]*>/g, '').trim()
        if (dist && dist !== 'Virtual Event') distances.push(dist)
      }

      // Check for virtual event
      const isVirtual = tileHtml.includes('Virtual Event') ? 1 : 0

      // Get primary distance (first non-virtual)
      const primaryDistStr = distances[0] || null
      const distanceMeters = primaryDistStr ? parseDistanceToMeters(primaryDistStr) : null
      const raceType = classifyRaceType(distanceMeters, distances)

      // Extract logo URL
      const logoMatch = tileHtml.match(/<img[^>]*src="(https:\/\/[^"]+)"/)
      const logoUrl = logoMatch?.[1] || null

      // Extract race URL path parts for ID
      const urlClean = raceUrl.split('?')[0] || ''
      const pathParts = urlClean.split('/')
      const raceSlug = pathParts.slice(2).join('-').toLowerCase() // TX-City-Name

      // Determine registration URL
      const registrationUrl = raceUrl.startsWith('/')
        ? `https://runsignup.com${urlClean}`
        : raceUrl.split('?')[0] || ''

      const raceId = `rsu_${raceSlug.replaceAll(/[^a-z0-9-]/g, '')}`

      races.push({
        id: raceId,
        slug: generateSlug(name, city, stateFromLoc, date),
        name,
        date,
        endDate: null,
        city,
        state: stateFromLoc,
        latitude: 0, // HTML doesn't include lat/lng — filled later via geocoding if needed
        longitude: 0,
        distanceMeters,
        raceType,
        url: registrationUrl,
        registrationUrl,
        description: null,
        logoUrl,
        source: 'runsignup',
        sourceId: raceSlug,
        dedupeKey: generateDedupeKey(name, date, stateFromLoc),
        participantCount: null,
        isVirtual,
        createdAt: now,
        updatedAt: now,
      })
    } catch {
      // Skip malformed tiles
      continue
    }
  }

  return races
}

/**
 * Fetch upcoming races from RunSignUp by scraping the public HTML pages.
 * No API key required.
 */
export async function fetchRunSignUpRaces(options: {
  state: string
  page?: number
}): Promise<{ races: NewRace[]; hasMore: boolean }> {
  const { state, page = 1 } = options

  const params = new URLSearchParams({
    state,
  })
  if (page > 1) params.set('page', String(page))

  const url = `${BASE_URL}?${params.toString()}`

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; WhereRun/1.0; +https://where-run.nard.uk)',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    throw new Error(`RunSignUp page error: ${response.status} ${response.statusText}`)
  }

  const html = await response.text()
  const races = parseRaceTiles(html, state)

  // Check if there's a next page link
  const hasMore = html.includes(`page=${page + 1}`)

  return { races, hasMore }
}

/** US states to scrape — all 50 + DC */
export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC',
]
