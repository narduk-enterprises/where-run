/**
 * Cron handler: scrape upcoming races from RunSignUp API.
 *
 * Triggered by Cloudflare Cron Trigger (daily: "0 6 * * *")
 * Can also be invoked manually: GET /_cron/scrape-races
 *
 * Uses a deadline-based execution model to stay within
 * Cloudflare Worker CPU limits.
 */

import { eq, and } from 'drizzle-orm'
import { races, scrapeLogs, raceSources } from '#server/database/schema'
import { fetchRunSignUpRaces, US_STATES } from '#server/utils/scrapers/runsignup'

/** Wall-clock deadline in ms */
const DEADLINE_MS = 25_000
/** Max states to scrape per cron run */
const BATCH_SIZE = 10

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
    sourceSlug: 'runsignup',
    status: 'running',
    startedAt: now,
  })

  let totalFound = 0
  let totalInserted = 0
  let totalUpdated = 0
  const statesScraped: string[] = []

  try {
    // Calculate the date range: today → 6 months out
    const today = new Date()
    const startDate = today.toISOString().split('T')[0] ?? ''
    const endDate6mo = new Date(today)
    endDate6mo.setMonth(endDate6mo.getMonth() + 6)
    const endDate = endDate6mo.toISOString().split('T')[0] ?? ''

    // Determine which states to scrape this run (rotate through all 51)
    // Use day-of-year to cycle through batches
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000,
    )
    const startIdx = (dayOfYear * BATCH_SIZE) % US_STATES.length
    const stateBatch: string[] = []
    for (let i = 0; i < BATCH_SIZE && i < US_STATES.length; i++) {
      const idx = (startIdx + i) % US_STATES.length
      const state = US_STATES[idx]
      if (state) stateBatch.push(state)
    }

    for (const state of stateBatch) {
      if (remaining() < 3_000) {
        console.log(`[Scraper] Deadline approaching — stopping at state ${state}`)
        break
      }

      try {
        const result = await fetchRunSignUpRaces({
          state,
          page: 1,
          resultsPerPage: 100,
          startDate,
          endDate,
        })

        totalFound += result.races.length
        statesScraped.push(state)

        // Upsert races
        for (const race of result.races) {
          if (remaining() < 1_000) break

          const existing = await db
            .select()
            .from(races)
            .where(and(eq(races.source, 'runsignup'), eq(races.sourceId, race.sourceId)))
            .limit(1)
            .all()

          if (existing.length > 0) {
            await db
              .update(races)
              .set({
                name: race.name,
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
                isVirtual: race.isVirtual,
                updatedAt: now,
              })
              .where(eq(races.id, existing[0]!.id))
            totalUpdated++
          } else {
            await db.insert(races).values(race)
            totalInserted++
          }
        }
      } catch (stateErr: unknown) {
        const error = stateErr as { message?: string }
        console.error(`[Scraper] Failed to scrape ${state}: ${error.message}`)
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
    await db
      .insert(raceSources)
      .values({
        id: 'runsignup',
        name: 'RunSignUp',
        slug: 'runsignup',
        apiBaseUrl: 'https://runsignup.com/Rest',
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
    statesScraped,
    racesFound: totalFound,
    racesInserted: totalInserted,
    racesUpdated: totalUpdated,
    elapsedMs: elapsed(),
    timestamp: new Date().toISOString(),
  }
})
