/**
 * GET /api/races/cities
 *
 * Aggregate race counts by city within a state.
 * Query params: state (required, US state abbreviation)
 */

import { races } from '#server/database/schema'
import { sql } from 'drizzle-orm'
import { z } from 'zod'

const querySchema = z.object({
  state: z.string().min(2).max(2).toUpperCase().optional(),
})

export default defineEventHandler(async (event) => {
  const raw = getQuery(event)
  const parsed = querySchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid query parameters' })
  }

  const db = useDatabase(event)
  const today = new Date().toISOString().split('T')[0] ?? ''

  const conditions = [
    sql`${races.date} >= ${today}`,
    sql`${races.isVirtual} = 0`,
  ]

  if (parsed.data.state) {
    conditions.push(sql`${races.state} = ${parsed.data.state}`)
  }

  const results = await db
    .select({
      city: races.city,
      state: races.state,
      count: sql<number>`count(*)`,
    })
    .from(races)
    .where(sql.join(conditions, sql` AND `))
    .groupBy(races.city, races.state)
    .orderBy(sql`count(*) DESC`)
    .all()

  return { cities: results }
})
