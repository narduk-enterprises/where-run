/**
 * raceConstants — Shared constants for race data.
 *
 * Separated from composables for reliable SSR resolution.
 */

/** US state name mapping */
export const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia',
}

/** Format race type for display */
export function formatRaceType(type: string): string {
  const labels: Record<string, string> = {
    '5k': '5K',
    '10k': '10K',
    half: 'Half Marathon',
    marathon: 'Marathon',
    ultra: 'Ultra',
    trail: 'Trail',
    other: 'Other',
  }
  return labels[type] || type
}

/** Format distance in meters for display */
export function formatDistance(meters: number | null): string {
  if (!meters) return ''
  if (meters < 1600) return `${meters}m`
  const miles = meters / 1609.344
  if (miles < 1.5) return `${meters}m`
  return `${miles.toFixed(1)} mi`
}

/** Get emoji for race type */
export function raceTypeEmoji(type: string): string {
  const emojis: Record<string, string> = {
    '5k': '🏃',
    '10k': '🏃‍♂️',
    half: '🏅',
    marathon: '🏆',
    ultra: '⛰️',
    trail: '🌲',
    other: '👟',
  }
  return emojis[type] || '👟'
}

/** Get icon name for race type */
export function raceTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    '5k': 'i-lucide-timer',
    '10k': 'i-lucide-gauge',
    half: 'i-lucide-medal',
    marathon: 'i-lucide-trophy',
    ultra: 'i-lucide-mountain',
    trail: 'i-lucide-trees',
    other: 'i-lucide-footprints',
  }
  return icons[type] || 'i-lucide-footprints'
}

/** Race type options for the filter dropdown */
export const RACE_TYPE_OPTIONS = [
  { label: 'All Types', value: '' },
  { label: '5K', value: '5k' },
  { label: '10K', value: '10k' },
  { label: 'Half Marathon', value: 'half' },
  { label: 'Marathon', value: 'marathon' },
  { label: 'Ultra Marathon', value: 'ultra' },
  { label: 'Trail Run', value: 'trail' },
]
