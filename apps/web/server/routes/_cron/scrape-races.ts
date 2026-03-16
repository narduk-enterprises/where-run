/**
 * Cron handler: multi-source race scraper.
 *
 * Sources: RunSignUp (primary), Active.com (secondary)
 * Triggered by Cloudflare Cron Trigger (daily: "0 6 * * *")
 * Can also be invoked manually: GET /_cron/scrape-races
 *
 * Uses a deadline-based execution model to stay within
 * Cloudflare Worker CPU limits (25s wall-clock).
 *
 * Strategy:
 * - Scrape ALL 51 states per run (not batched)
 * - 500 results/page from RunSignUp (up to 2 pages/state)
 * - Active.com sweep for additional coverage
 * - Cross-source deduplication via dedupeKey
 */

import { eq, and } from 'drizzle-orm'
import { races, scrapeLogs, raceSources } from '#server/database/schema'
import { fetchRunSignUpRaces, US_STATES } from '#server/utils/scrapers/runsignup'
import { fetchActiveComRaces } from '#server/utils/scrapers/active'

/** Wall-clock deadline in ms */
const DEADLINE_MS = 22_000
/** Max pages per state per source */
const MAX_PAGES_PER_STATE = 2

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  const elapsed = () => Date.now() - startTime
  const remaining = () => DEADLINE_MS - elapsed()

  const db = useDatabase(event)
  const config = useRuntimeConfig(event)
  const now = new Date().toISOString()
  const logId = `scrape_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

  // Create scrape log entry
  await db.insert(scrapeLogs).values({
    id: logId,
    sourceSlug: 'multi',
    status: 'running',
    startedAt: now,
  })

  let totalFound = 0
  let totalInserted = 0
  let totalUpdated = 0
  let totalSkippedDupe = 0
  const statesScraped: string[] = []
  const sourcesUsed: string[] = []

  try {
    // Date range: today → 6 months out
    const today = new Date()
    const startDate = today.toISOString().split('T')[0] ?? ''
    const endDate6mo = new Date(today)
    endDate6mo.setMonth(endDate6mo.getMonth() + 6)
    const endDate = endDate6mo.toISOString().split('T')[0] ?? ''

    // ── Phase 1: RunSignUp (primary, largest source) ──
    sourcesUsed.push('runsignup')
    for (const state of US_STATES) {
      if (remaining() < 2_000) {
        console.log(`[Scraper] Deadline approaching — stopping RunSignUp at ${state}`)
        break
      }

      try {
        for (let page = 1; page <= MAX_PAGES_PER_STATE; page++) {
          if (remaining() < 1_500) break

          const result = await fetchRunSignUpRaces({
            state,
            page,
            resultsPerPage: 500,
            startDate,
            endDate,
            apiKey: config.runsignupApiKey,
          })

          totalFound += result.races.length
          if (page === 1) statesScraped.push(state)

          // Batch upsert races
          const upsertResult = await upsertRaces(db, result.races, now)
          totalInserted += upsertResult.inserted
          totalUpdated += upsertResult.updated
          totalSkippedDupe += upsertResult.skippedDupe

          // Stop paginating if no more results
          if (!result.hasMore || result.races.length === 0) break
        }
      } catch (stateErr: unknown) {
        const error = stateErr as { message?: string }
        console.error(`[Scraper] RunSignUp ${state}: ${error.message}`)
      }
    }

    // ── Phase 2: Active.com (secondary, if time remains) ──
    if (remaining() > 5_000 && config.activeComApiKey) {
      sourcesUsed.push('active')
      // Active.com is slower, so scrape fewer states
      const activeStates = [
        'CA',
        'TX',
        'NY',
        'FL',
        'CO',
        'OR',
        'WA',
        'IL',
        'MA',
        'PA',
        'GA',
        'NC',
        'VA',
        'OH',
        'AZ',
        'TN',
        'MN',
        'MI',
        'NJ',
        'MD',
      ]

      for (const state of activeStates) {
        if (remaining() < 2_000) {
          console.log(`[Scraper] Deadline approaching — stopping Active.com at ${state}`)
          break
        }

        try {
          const result = await fetchActiveComRaces({
            state,
            page: 1,
            resultsPerPage: 50,
            startDate,
            endDate,
            apiKey: config.activeComApiKey,
          })

          totalFound += result.races.length

          const upsertResult = await upsertRaces(db, result.races, now)
          totalInserted += upsertResult.inserted
          totalUpdated += upsertResult.updated
          totalSkippedDupe += upsertResult.skippedDupe
        } catch (stateErr: unknown) {
          const error = stateErr as { message?: string }
          console.error(`[Scraper] Active.com ${state}: ${error.message}`)
        }
      }
    }

    // Update scrape log
    await db
      .update(scrapeLogs)
      .set({
        status: 'success',
        racesFound: totalFound,
        racesInserted: totalInserted,
        racesUpdated: totalUpdated,
        completedAt: new Date().toISOString(),
      })
      .where(eq(scrapeLogs.id, logId))

    // Update race source metadata
    for (const source of sourcesUsed) {
      await db
        .insert(raceSources)
        .values({
          id: source,
          name: source === 'runsignup' ? 'RunSignUp' : 'Active.com',
          slug: source,
          apiBaseUrl:
            source === 'runsignup' ? 'https://runsignup.com/Rest' : 'http://api.amp.active.com/v2',
          isActive: 1,
          lastScrapedAt: now,
          totalRacesScraped: totalFound,
          createdAt: now,
        })
        .onConflictDoUpdate({
          target: raceSources.id,
          set: {
            lastScrapedAt: now,
            totalRacesScraped: totalFound,
          },
        })
    }
  } catch (err: unknown) {
    const error = err as { message?: string }
    await db
      .update(scrapeLogs)
      .set({
        status: 'failed',
        errorMessage: error.message || 'Unknown error',
        completedAt: new Date().toISOString(),
      })
      .where(eq(scrapeLogs.id, logId))

    return {
      ok: false,
      error: error.message,
      elapsedMs: elapsed(),
    }
  }

  return {
    ok: true,
    sources: sourcesUsed,
    statesScraped: statesScraped.length,
    racesFound: totalFound,
    racesInserted: totalInserted,
    racesUpdated: totalUpdated,
    skippedDuplicates: totalSkippedDupe,
    elapsedMs: elapsed(),
    timestamp: new Date().toISOString(),
  }
})

/**
 * Batch upsert races with cross-source deduplication.
 * Uses source+sourceId as primary key, dedupeKey for cross-source matching.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- db type from useDatabase is untyped DrizzleD1Database
async function upsertRaces(db: any, raceList: (typeof races.$inferInsert)[], now: string) {
  let inserted = 0
  let updated = 0
  let skippedDupe = 0

  for (const race of raceList) {
    // Check if race already exists (same source + sourceId)
    const existing = await db
      .select({ id: races.id })
      .from(races)
      .where(and(eq(races.source, race.source), eq(races.sourceId, race.sourceId)))
      .limit(1)
      .all()

    if (existing.length > 0) {
      // Update existing race
      await db
        .update(races)
        .set({
          name: race.name,
          slug: race.slug,
          date: race.date,
          city: race.city,
          state: race.state,
          latitude: race.latitude,
          longitude: race.longitude,
          distanceMeters: race.distanceMeters,
          raceType: race.raceType,
          url: race.url,
          registrationUrl: race.registrationUrl,
          description: race.description,
          logoUrl: race.logoUrl,
          dedupeKey: race.dedupeKey,
          isVirtual: race.isVirtual,
          updatedAt: now,
        })
        .where(eq(races.id, existing[0]!.id))
      updated++
      continue
    }

    // Cross-source dedup check via dedupeKey
    if (race.dedupeKey) {
      const dupeCheck = await db
        .select({ id: races.id })
        .from(races)
        .where(eq(races.dedupeKey, race.dedupeKey))
        .limit(1)
        .all()

      if (dupeCheck.length > 0) {
        skippedDupe++
        continue
      }
    }

    // Insert new race
    await db.insert(races).values(race)
    inserted++
  }

  return { inserted, updated, skippedDupe }
}
