<script setup lang="ts">

const { toMapItems, createRacePin, selectedRaceId, defaultCenter, defaultZoomSpan } = useRaceMap()
const {
  searchQuery,
  selectedState,
  selectedType,
  currentPage,
  activeFilters,
  hasFilters,
  clearFilters,
} = useRaceSearch()

useSeo({
  title: 'Search Running Races — Where Run',
  description: 'Search and discover running races across the United States. Filter by state, distance type, and more. Map-based race discovery.',
  keywords: ['search running races', 'find races near me', 'race search', '5K near me', 'marathon search', 'trail run search', 'running events'],
  ogImage: { title: 'Search Races', description: 'Map-based race discovery', icon: 'i-lucide-search' },
  canonicalUrl: 'https://where-run.nard.uk/search',
})
useWebPageSchema({ name: 'Race Search', description: 'Search running races across the United States with map-based discovery.' })

// Reactive data fetch with computed query
const { data, status } = useFetch('/api/races', {
  query: activeFilters,
  watch: [activeFilters],
})

const races = computed(() => (data.value as any)?.races || [])
const pagination = computed(() => (data.value as any)?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
const mapItems = computed(() => toMapItems(races.value))

// Read initial state from URL query
const route = useRoute()
onMounted(() => {
  if (route.query.state) selectedState.value = String(route.query.state)
  if (route.query.raceType) selectedType.value = String(route.query.raceType)
  if (route.query.q) searchQuery.value = String(route.query.q)
})

// State options for the dropdown
const stateOptions = computed(() => {
  const entries = Object.entries(STATE_NAMES || {})
  const states = entries.map(([abbr, name]) => ({
    label: name,
    value: abbr,
  }))
  return [{ label: 'All States', value: '' }, ...states.sort((a, b) => a.label.localeCompare(b.label))]
})

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function daysUntil(dateStr: string) {
  const raceDate = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((raceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}
</script>

<template>
  <div class="flex min-h-[calc(100vh-56px)] flex-col">
    <!-- Filter Bar -->
    <div class="border-default sticky top-14 z-30 border-b bg-default/90 backdrop-blur-xl">
      <div class="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        <div class="flex flex-wrap items-center gap-3">
          <!-- Search -->
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="Search races..."
            class="w-full sm:w-64"
            size="md"
          />

          <!-- State filter -->
          <USelect
            v-model="selectedState"
            :items="stateOptions"
            value-key="value"
            placeholder="All States"
            class="w-40"
            size="md"
          />

          <!-- Type filter -->
          <USelect
            v-model="selectedType"
            :items="RACE_TYPE_OPTIONS"
            value-key="value"
            placeholder="All Types"
            class="w-40"
            size="md"
          />

          <!-- Clear filters -->
          <UButton
            v-if="hasFilters"
            variant="ghost"
            icon="i-lucide-x"
            size="sm"
            color="error"
            @click="clearFilters"
          >
            Clear
          </UButton>

          <!-- Result count -->
          <div class="text-dimmed ml-auto text-sm font-medium">
            <template v-if="status === 'success'">
              <span class="text-primary font-bold">{{ pagination.total }}</span>
              {{ pagination.total === 1 ? 'race' : 'races' }} found
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content: Map + List -->
    <div class="flex flex-1 flex-col lg:flex-row">
      <!-- Map Panel -->
      <div class="relative h-[300px] w-full lg:h-auto lg:w-3/5">
        <ClientOnly>
          <AppMapKit
            :items="mapItems"
            :create-pin-element="createRacePin"
            :fallback-center="defaultCenter"
            :zoom-span="races.length ? undefined : defaultZoomSpan"
            v-model:selected-id="selectedRaceId"
            class="h-full w-full"
          />
          <template #fallback>
            <div class="flex h-full items-center justify-center bg-muted">
              <div class="text-center">
                <UIcon name="i-lucide-map" class="text-dimmed mb-2 size-10" />
                <p class="text-dimmed text-sm">Loading map...</p>
              </div>
            </div>
          </template>
        </ClientOnly>

        <!-- Map overlay with race count -->
        <div v-if="status === 'success' && races.length" class="absolute bottom-4 left-4">
          <div class="glass rounded-lg px-3 py-1.5 text-xs font-medium text-default shadow-elevated">
            <UIcon name="i-lucide-map-pin" class="text-primary mr-1 inline size-3" />
            {{ races.length }} races on map
          </div>
        </div>
      </div>

      <!-- Race List -->
      <div class="w-full overflow-y-auto lg:w-2/5 lg:h-[calc(100vh-112px)]">
        <!-- Loading -->
        <div v-if="status === 'pending'" class="flex items-center justify-center p-16">
          <UIcon name="i-lucide-loader-2" class="text-primary size-8 animate-spin" />
        </div>

        <!-- Empty state -->
        <div v-else-if="races.length === 0" class="p-12 text-center">
          <UIcon name="i-lucide-search-x" class="text-dimmed mx-auto mb-4 size-14" />
          <h3 class="text-default mb-2 text-lg font-bold">No races found</h3>
          <p class="text-muted mb-6 text-sm">Try adjusting your filters or search query.</p>
          <UButton v-if="hasFilters" variant="soft" color="primary" @click="clearFilters">
            Clear Filters
          </UButton>
        </div>

        <!-- Race Cards -->
        <div v-else class="divide-y divide-default">
          <NuxtLink
            v-for="race in races"
            :key="race.id"
            :to="`/race/${race.id}`"
            class="group flex gap-4 p-4 transition-colors hover:bg-elevated cursor-pointer"
            :class="{ 'bg-primary/5 border-l-2 border-primary': selectedRaceId === race.id }"
            @mouseenter="selectedRaceId = race.id"
          >
            <!-- Date badge -->
            <div class="flex w-14 shrink-0 flex-col items-center rounded-xl bg-primary/10 py-2">
              <span class="text-primary text-[10px] font-bold uppercase">
                {{ new Date(race.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' }) }}
              </span>
              <span class="text-primary text-lg font-bold leading-tight">
                {{ new Date(race.date + 'T00:00:00').getDate() }}
              </span>
            </div>

            <!-- Details -->
            <div class="min-w-0 flex-1">
              <h3 class="text-default mb-1 truncate text-sm font-bold group-hover:text-primary transition-colors">
                {{ race.name }}
              </h3>

              <div class="text-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span class="flex items-center gap-1">
                  <UIcon name="i-lucide-map-pin" class="size-3" />
                  {{ race.city }}, {{ race.state }}
                </span>
                <UBadge variant="subtle" size="xs" color="primary">
                  {{ formatRaceType(race.raceType) }}
                </UBadge>
                <span class="text-dimmed">
                  {{ daysUntil(race.date) > 0 ? `in ${daysUntil(race.date)}d` : 'Today' }}
                </span>
              </div>
            </div>

            <UIcon
              name="i-lucide-chevron-right"
              class="text-dimmed my-auto size-4 shrink-0 transition-transform group-hover:translate-x-1"
            />
          </NuxtLink>
        </div>

        <!-- Pagination -->
        <div v-if="pagination.totalPages > 1" class="flex items-center justify-center gap-2 border-t border-default p-4">
          <UButton
            variant="ghost"
            icon="i-lucide-chevron-left"
            :disabled="currentPage <= 1"
            size="sm"
            @click="currentPage--"
          />
          <span class="text-muted text-sm font-medium">
            Page {{ currentPage }} of {{ pagination.totalPages }}
          </span>
          <UButton
            variant="ghost"
            icon="i-lucide-chevron-right"
            :disabled="currentPage >= pagination.totalPages"
            size="sm"
            @click="currentPage++"
          />
        </div>
      </div>
    </div>
  </div>
</template>
