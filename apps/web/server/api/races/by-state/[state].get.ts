import { eq, and, gte, asc } from 'drizzle-orm'
import { races } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const stateParam = getRouterParam(event, 'state')
  if (!stateParam) {
    throw createError({ statusCode: 400, statusMessage: 'State is required' })
  }

  const state = stateParam.toUpperCase()
  const db = useDatabase(event)
  const today = new Date().toISOString().split('T')[0]!

  const stateRaces = await db
    .select()
    .from(races)
    .where(and(eq(races.state, state), gte(races.date, today)))
    .orderBy(asc(races.date))
    .all()

  // Aggregate types
  const typeCounts: Record<string, number> = {}
  for (const r of stateRaces) {
    typeCounts[r.raceType] = (typeCounts[r.raceType] || 0) + 1
  }

  return {
    state,
    races: stateRaces,
    total: stateRaces.length,
    types: Object.entries(typeCounts).map(([type, count]) => ({ type, count })),
  }
})
