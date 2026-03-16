/**
 * Cron handler: scrape races from public listing pages.
 *
 * Primary source: RunSignUp HTML pages (no API key required)
 * Triggered by Cloudflare Cron Trigger (daily: "0 6 * * *")
 * Can also be invoked manually: GET /_cron/scrape-races
 *
 * Strategy:
 * - Scrape ALL 51 states from RunSignUp public pages
 * - 30 races/page, up to 3 pages per state
 * - Cross-source deduplication via dedupeKey
 * - Deadline-based execution (22s) to stay within CF limits
 */

import { eq, and } from 'drizzle-orm'
import { races, scrapeLogs, raceSources } from '#server/database/schema'
import { fetchRunSignUpRaces, US_STATES } from '#server/utils/scrapers/runsignup'

/** Wall-clock deadline in ms */
const DEADLINE_MS = 22_000
/** Max pages per state */
const MAX_PAGES_PER_STATE = 3
/** Delay between requests to avoid rate limiting (ms) */
const REQUEST_DELAY_MS = 200

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  const elapsed = () => Date.now() - startTime
  const remaining = () => DEADLINE_MS - elapsed()

  const db = useDatabase(event)
  const now = new Date().toISOString()
  const logId = `scrape_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

  // Create scrape log entry
  await db.insert(scrapeLogs).values({
    id: logId,
    sourceSlug: 'runsignup-html',
    status: 'running',
    startedAt: now,
  })

  let totalFound = 0
  let totalInserted = 0
  let totalUpdated = 0
  let totalSkippedDupe = 0
  const statesScraped: string[] = []

  try {
    for (const state of US_STATES) {
      if (remaining() < 2_000) {
        console.log(`[Scraper] Deadline approaching — stopping at ${state}`)
        break
      }

      try {
        for (let page = 1; page <= MAX_PAGES_PER_STATE; page++) {
          if (remaining() < 1_500) break

          const result = await fetchRunSignUpRaces({ state, page })

          totalFound += result.races.length
          if (page === 1) statesScraped.push(state)

          // Upsert each race
          for (const race of result.races) {
            if (remaining() < 500) break

            // Check existing by source + sourceId
            const existing = await db
              .select({ id: races.id })
              .from(races)
              .where(and(eq(races.source, race.source), eq(races.sourceId, race.sourceId)))
              .limit(1)
              .all()

            if (existing.length > 0) {
              await db
                .update(races)
                .set({
                  name: race.name,
                  slug: race.slug,
                  date: race.date,
                  city: race.city,
                  state: race.state,
                  distanceMeters: race.distanceMeters,
                  raceType: race.raceType,
                  url: race.url,
                  registrationUrl: race.registrationUrl,
                  logoUrl: race.logoUrl,
                  dedupeKey: race.dedupeKey,
                  isVirtual: race.isVirtual,
                  updatedAt: now,
                })
                .where(eq(races.id, existing[0]!.id))
              totalUpdated++
              continue
            }

            // Cross-source dedup check
            if (race.dedupeKey) {
              const dupeCheck = await db
                .select({ id: races.id })
                .from(races)
                .where(eq(races.dedupeKey, race.dedupeKey))
                .limit(1)
                .all()

              if (dupeCheck.length > 0) {
                totalSkippedDupe++
                continue
              }
            }

            // Insert new race
            await db.insert(races).values(race)
            totalInserted++
          }

          // Stop paginating if no more results
          if (!result.hasMore || result.races.length === 0) break

          // Brief delay between pages to be polite
          if (page < MAX_PAGES_PER_STATE && result.hasMore) {
            await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY_MS))
          }
        }
      } catch (stateErr: unknown) {
        const error = stateErr as { message?: string }
        console.error(`[Scraper] ${state}: ${error.message}`)
      }

      // Brief delay between states
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY_MS))
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
    await db
      .insert(raceSources)
      .values({
        id: 'runsignup-html',
        name: 'RunSignUp (HTML Scraper)',
        slug: 'runsignup-html',
        apiBaseUrl: 'https://runsignup.com/Races',
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
    source: 'runsignup-html',
    statesScraped: statesScraped.length,
    statesList: statesScraped,
    racesFound: totalFound,
    racesInserted: totalInserted,
    racesUpdated: totalUpdated,
    skippedDuplicates: totalSkippedDupe,
    elapsedMs: elapsed(),
    timestamp: new Date().toISOString(),
  }
})
