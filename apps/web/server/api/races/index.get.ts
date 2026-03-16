/**
 * GET /api/races
 *
 * Search and filter races with support for:
 * - state, city, raceType, startDate, endDate, page, limit
 * - Full-text search via `q` parameter
 */

import { races } from '#server/database/schema'
import { eq, and, gte, lte, like, sql } from 'drizzle-orm'
import { z } from 'zod'

const querySchema = z.object({
  state: z.string().optional(),
  city: z.string().optional(),
  raceType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  includeVirtual: z.string().optional(),
  includePast: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const raw = getQuery(event)
  const query = querySchema.parse(raw)

  const page = query.page
  const limit = query.limit
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
