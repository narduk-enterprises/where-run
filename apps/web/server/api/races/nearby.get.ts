/**
 * GET /api/races/nearby
 *
 * Geo-proximity search using Haversine formula.
 * Query params: lat, lng, radius (miles, default 25)
 */

import { races } from '#server/database/schema'
import { sql, eq, gte } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event) as Record<string, string | undefined>

  const lat = Number(query.lat)
  const lng = Number(query.lng)
  const radiusMiles = Math.min(200, Math.max(1, Number(query.radius) || 25))
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 50))

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    throw createError({
      statusCode: 400,
      message: 'lat and lng query parameters are required',
    })
  }

  const db = useDatabase(event)

  // Only show upcoming races
  const today = new Date().toISOString().split('T')[0] ?? ''

  // Haversine distance formula in SQL (returns miles)
  const distanceExpr = sql<number>`(
    3959 * acos(
      cos(radians(${lat})) * cos(radians(${races.latitude}))
      * cos(radians(${races.longitude}) - radians(${lng}))
      + sin(radians(${lat})) * sin(radians(${races.latitude}))
    )
  )`

  // SQLite doesn't have native radians/acos, so we use a bounding box
  // pre-filter then compute actual distance in JS
  const latRange = radiusMiles / 69 // ~69 miles per degree of latitude
  const lngRange = radiusMiles / (69 * Math.cos((lat * Math.PI) / 180))

  const results = await db
    .select()
    .from(races)
    .where(
      sql`${races.latitude} BETWEEN ${lat - latRange} AND ${lat + latRange}
          AND ${races.longitude} BETWEEN ${lng - lngRange} AND ${lng + lngRange}
          AND ${races.date} >= ${today}
          AND ${races.isVirtual} = 0`,
    )
    .limit(500) // Pre-filter limit before JS distance calc
    .all()

  // Calculate exact distances and filter
  const withDistance = results
    .map((race) => {
      const dLat = ((race.latitude - lat) * Math.PI) / 180
      const dLng = ((race.longitude - lng) * Math.PI) / 180
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat * Math.PI) / 180) *
          Math.cos((race.latitude * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      const distanceMiles = 3959 * c

      return { ...race, distanceMiles: Math.round(distanceMiles * 10) / 10 }
    })
    .filter((r) => r.distanceMiles <= radiusMiles)
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
    .slice(0, limit)

  return {
    races: withDistance,
    center: { lat, lng },
    radiusMiles,
    total: withDistance.length,
  }
})
