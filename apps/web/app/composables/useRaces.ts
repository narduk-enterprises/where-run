/**
 * useRaces — Data fetching composable for race data.
 *
 * Follows the Thin Component pattern: pages call this composable,
 * not $fetch/$useFetch directly.
 */

import type { Race } from '~~/server/database/schema'

interface RaceWithDistance extends Race {
  distanceMiles?: number
}

interface RacesResponse {
  races: Race[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface NearbyResponse {
  races: RaceWithDistance[]
  center: { lat: number; lng: number }
  radiusMiles: number
  total: number
}

interface StatesResponse {
  states: Array<{ state: string; count: number }>
}

export function useRaces() {
  /**
   * Fetch races with optional filters.
   */
  function fetchRaces(params?: {
    state?: string
    city?: string
    raceType?: string
    startDate?: string
    endDate?: string
    q?: string
    page?: number
    limit?: number
  }) {
    const query: Record<string, string> = {}
    if (params?.state) query.state = params.state
    if (params?.city) query.city = params.city
    if (params?.raceType) query.raceType = params.raceType
    if (params?.startDate) query.startDate = params.startDate
    if (params?.endDate) query.endDate = params.endDate
    if (params?.q) query.q = params.q
    if (params?.page) query.page = String(params.page)
    if (params?.limit) query.limit = String(params.limit)

    return useFetch<RacesResponse>('/api/races', { query })
  }

  /**
   * Fetch a single race by ID.
   */
  function fetchRaceById(id: string) {
    return useFetch<{ race: Race }>(`/api/races/${id}`)
  }

  /**
   * Fetch races near a geographic point.
   */
  function fetchNearbyRaces(lat: number, lng: number, radius?: number) {
    return useFetch<NearbyResponse>('/api/races/nearby', {
      query: { lat: String(lat), lng: String(lng), radius: String(radius || 25) },
    })
  }

  /**
   * Fetch race counts by state.
   */
  function fetchRacesByState() {
    return useFetch<StatesResponse>('/api/races/states')
  }

  return {
    fetchRaces,
    fetchRaceById,
    fetchNearbyRaces,
    fetchRacesByState,
  }
}
