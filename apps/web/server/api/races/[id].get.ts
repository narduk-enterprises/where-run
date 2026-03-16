/**
 * GET /api/races/:id
 *
 * Get a single race by ID.
 */

import { races } from '#server/database/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Race ID is required' })
  }

  const db = useDatabase(event)

  const result = await db.select().from(races).where(eq(races.id, id)).limit(1).all()

  if (result.length === 0) {
    throw createError({ statusCode: 404, message: 'Race not found' })
  }

  return { race: result[0] }
})
