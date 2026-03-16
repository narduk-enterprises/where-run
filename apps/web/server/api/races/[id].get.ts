/**
 * GET /api/races/:id
 *
 * Get a single race by ID or slug.
 */

import { races } from '#server/database/schema'
import { eq, or } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const idOrSlug = getRouterParam(event, 'id')
  if (!idOrSlug) {
    throw createError({ statusCode: 400, message: 'Race ID or slug is required' })
  }

  const db = useDatabase(event)

  // Try both ID and slug lookup
  const result = await db
    .select()
    .from(races)
    .where(or(eq(races.id, idOrSlug), eq(races.slug, idOrSlug)))
    .limit(1)
    .all()

  if (result.length === 0) {
    throw createError({ statusCode: 404, message: 'Race not found' })
  }

  return { race: result[0] }
})
