/**
 * Shared scraper types and adapter interface.
 *
 * Each data source implements a scraper adapter that returns
 * normalized races in our schema format.
 */

import type { NewRace } from '#server/database/schema'

/** Result from a single scraper batch */
export interface ScraperBatchResult {
  races: NewRace[]
  totalResults: number
  /** Whether there are more pages available */
  hasMore: boolean
  /** Opaque cursor for resuming pagination */
  nextCursor?: string
}

/** Configuration for a scraper run */
export interface ScraperRunConfig {
  /** US state abbreviation to scrape */
  state: string
  /** Start date (ISO YYYY-MM-DD) */
  startDate: string
  /** End date (ISO YYYY-MM-DD) */
  endDate: string
  /** Page number (1-indexed) */
  page?: number
  /** Results per page */
  resultsPerPage?: number
}

/** Generate a URL-safe slug from race name, city, state, and date */
export function generateSlug(name: string, city: string, state: string, date: string): string {
  const raw = `${name}-${city}-${state}-${date}`
  return raw
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s-]/g, '')
    .replaceAll(/\s+/g, '-')
    .replaceAll(/-+/g, '-')
    .slice(0, 120)
}

/** Generate a deduplication key for cross-source matching */
export function generateDedupeKey(name: string, date: string, state: string): string {
  return (name.toLowerCase().replaceAll(/[^a-z0-9]/g, '') + date + state.toUpperCase()).slice(
    0,
    200,
  )
}
