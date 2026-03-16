/**
 * GET /api/races/states
 *
 * Aggregate race counts by US state.
 */

import { races } from '#server/database/schema'
import { sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDatabase(event)

  const today = new Date().toISOString().split('T')[0] ?? ''

  const results = await db
    .select({
      state: races.state,
      count: sql<number>`count(*)`,
    })
    .from(races)
    .where(sql`${races.date} >= ${today} AND ${races.isVirtual} = 0`)
    .groupBy(races.state)
    .orderBy(sql`count(*) DESC`)
    .all()

  return { states: results }
})
