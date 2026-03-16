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

interface StateRacesResponse {
  state: string
  races: Race[]
  total: number
  types: Array<{ type: string; count: number }>
}

interface CitiesResponse {
  cities: Array<{ city: string; state: string; count: number }>
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
   * Fetch a single race by ID or slug.
   */
  function fetchRaceById(idOrSlug: string) {
    return useFetch<{ race: Race }>(`/api/races/${idOrSlug}`)
  }

  /**
   * Fetch races for a specific state (for state SEO pages).
   */
  function fetchRacesByStateCode(state: string) {
    return useFetch<StateRacesResponse>(`/api/races/by-state/${state}`, {
      key: `state-races-${state}`,
    })
  }

  /**
   * Fetch city aggregation (for city browsing pages).
   */
  function fetchCities(state?: string) {
    const query: Record<string, string> = {}
    if (state) query.state = state
    return useFetch<CitiesResponse>('/api/races/cities', { query })
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
    fetchRacesByStateCode,
    fetchCities,
  }
}
