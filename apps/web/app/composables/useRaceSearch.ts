/**
 * useRaceSearch — Search state management composable.
 *
 * Manages filter state, pagination, and debounced search
 * for the race search page.
 */

export function useRaceSearch() {
  const searchQuery = useState<string>('race-search-q', () => '')
  const selectedState = useState<string>('race-search-state', () => '')
  const selectedType = useState<string>('race-search-type', () => '')
  const currentPage = useState<number>('race-search-page', () => 1)

  // Debounce timer
  const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
  const debouncedQuery = useState<string>('race-search-debounced', () => '')

  // Watch for query changes and debounce
  watch(searchQuery, (val) => {
    if (searchTimeout.value) clearTimeout(searchTimeout.value)
    searchTimeout.value = setTimeout(() => {
      debouncedQuery.value = val
      currentPage.value = 1 // Reset to first page on search
    }, 350)
  })

  // Reset page when filters change
  watch([selectedState, selectedType], () => {
    currentPage.value = 1
  })

  const activeFilters = computed(() => {
    const filters: Record<string, string> = {}
    if (debouncedQuery.value) filters.q = debouncedQuery.value
    if (selectedState.value) filters.state = selectedState.value
    if (selectedType.value) filters.raceType = selectedType.value
    filters.page = String(currentPage.value)
    filters.limit = '20'
    return filters
  })

  const hasFilters = computed(
    () => !!debouncedQuery.value || !!selectedState.value || !!selectedType.value,
  )

  function clearFilters() {
    searchQuery.value = ''
    debouncedQuery.value = ''
    selectedState.value = ''
    selectedType.value = ''
    currentPage.value = 1
  }

  return {
    searchQuery,
    debouncedQuery,
    selectedState,
    selectedType,
    currentPage,
    activeFilters,
    hasFilters,
    clearFilters,
  }
}
