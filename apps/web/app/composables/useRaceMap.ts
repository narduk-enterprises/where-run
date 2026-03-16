/**
 * useRaceMap — Map integration composable.
 *
 * Transforms race data into AppMapKit-compatible items
 * and provides a custom pin factory.
 */

import type { Race } from '~~/server/database/schema'

interface MapRaceItem {
  id: string
  lat: number
  lng: number
  race: Race
}

export function useRaceMap() {
  const selectedRaceId = useState<string | null>('map-selected-race', () => null)

  /**
   * Transform race records into map items for AppMapKit.
   */
  function toMapItems(raceList: Race[]): MapRaceItem[] {
    return raceList
      .filter((r) => r.latitude && r.longitude)
      .map((r) => ({
        id: r.id,
        lat: r.latitude,
        lng: r.longitude,
        race: r,
      }))
  }

  /**
   * Custom pin factory for race types.
   * Creates a DOM element with the race type icon.
   */
  function createRacePin(item: MapRaceItem, isSelected: boolean) {
    const el = document.createElement('div')

    const colorClass = isSelected ? 'bg-primary scale-125' : 'bg-primary/85'

    el.className = `size-9 rounded-full border-2 border-white shadow-elevated flex items-center justify-center text-white text-base transition-transform ${colorClass}`
    el.style.cursor = 'pointer'
    el.style.transition = 'transform 200ms ease, background-color 200ms ease'

    // Use race type emoji
    const emojis: Record<string, string> = {
      '5k': '🏃',
      '10k': '🏃',
      half: '🏅',
      marathon: '🏆',
      ultra: '⛰️',
      trail: '🌲',
      other: '👟',
    }
    el.textContent = emojis[item.race.raceType] || '👟'

    return { element: el }
  }

  /**
   * Default map center (center of continental US).
   */
  const defaultCenter = { lat: 39.8283, lng: -98.5795 }
  const defaultZoomSpan = { lat: 25, lng: 40 } // Continental US view

  return {
    selectedRaceId,
    toMapItems,
    createRacePin,
    defaultCenter,
    defaultZoomSpan,
  }
}
