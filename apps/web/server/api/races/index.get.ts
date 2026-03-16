/**
 * GET /api/races
 *
 * Search and filter races with support for:
 * - state, city, raceType, startDate, endDate, page, limit
 * - Full-text search via `q` parameter
 */

import { races } from '#server/database/schema'
import { eq, and, gte, lte, like, sql, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event) as Record<string, string | undefined>

  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))
  const offset = (page - 1) * limit

  const db = useDatabase(event)

  // Build conditions array
  const conditions = []

  if (query.state) {
    conditions.push(eq(races.state, query.state.toUpperCase()))
  }

  if (query.city) {
    conditions.push(like(races.city, `%${query.city}%`))
  }

  if (query.raceType) {
    conditions.push(eq(races.raceType, query.raceType))
  }

  if (query.startDate) {
    conditions.push(gte(races.date, query.startDate))
  }

  if (query.endDate) {
    conditions.push(lte(races.date, query.endDate))
  }

  if (query.q) {
    conditions.push(like(races.name, `%${query.q}%`))
  }

  // Exclude virtual races by default
  if (query.includeVirtual !== 'true') {
    conditions.push(eq(races.isVirtual, 0))
  }

  // Only show upcoming races (today or later) unless explicitly requesting past
  if (query.includePast !== 'true') {
    const today = new Date().toISOString().split('T')[0] ?? ''
    conditions.push(gte(races.date, today))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(races)
      .where(where)
      .orderBy(races.date)
      .limit(limit)
      .offset(offset)
      .all(),
    db
      .select({ count: sql<number>`count(*)` })
      .from(races)
      .where(where)
      .all(),
  ])

  const total = countResult[0]?.count ?? 0

  return {
    races: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
})
