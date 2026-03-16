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
  title: 'Search Races — Where Run',
  description: 'Search and discover running races across the United States. Filter by state, distance type, and more.',
  ogImage: { title: 'Search Races', description: 'Find races near you', icon: '🔍' },
})
useWebPageSchema({ name: 'Race Search', description: 'Search running races across the United States.' })

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
    year: 'numeric',
  })
}
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <!-- Header / Filter Bar -->
    <div class="border-default sticky top-0 z-30 border-b bg-default/80 backdrop-blur-xl">
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
            @click="clearFilters"
          >
            Clear
          </UButton>

          <!-- Result count -->
          <div class="text-dimmed ml-auto text-sm">
            <template v-if="status === 'success'">
              {{ pagination.total }} {{ pagination.total === 1 ? 'race' : 'races' }} found
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content: Map + List -->
    <div class="flex flex-1 flex-col lg:flex-row">
      <!-- Map Panel -->
      <div class="relative h-[350px] w-full lg:h-auto lg:w-1/2">
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
              <UIcon name="i-lucide-map" class="text-dimmed size-12" />
            </div>
          </template>
        </ClientOnly>
      </div>

      <!-- Race List -->
      <div class="w-full overflow-y-auto lg:w-1/2 lg:h-[calc(100vh-64px)]">
        <!-- Loading -->
        <div v-if="status === 'pending'" class="flex items-center justify-center p-12">
          <UIcon name="i-lucide-loader-2" class="text-primary size-8 animate-spin" />
        </div>

        <!-- Empty state -->
        <div v-else-if="races.length === 0" class="p-12 text-center">
          <UIcon name="i-lucide-search-x" class="text-dimmed mx-auto mb-4 size-12" />
          <h3 class="text-default mb-2 text-lg font-semibold">No races found</h3>
          <p class="text-muted mb-4">Try adjusting your filters or search query.</p>
          <UButton v-if="hasFilters" variant="soft" @click="clearFilters">
            Clear Filters
          </UButton>
        </div>

        <!-- Race Cards -->
        <div v-else class="divide-y divide-default">
          <NuxtLink
            v-for="race in races"
            :key="race.id"
            :to="`/race/${race.id}`"
            class="group flex gap-4 p-4 transition-colors hover:bg-elevated"
            :class="{ 'bg-primary/5': selectedRaceId === race.id }"
            @mouseenter="selectedRaceId = race.id"
          >
            <!-- Date badge -->
            <div class="flex w-14 shrink-0 flex-col items-center rounded-lg bg-primary/10 p-2">
              <span class="text-primary text-xs font-bold uppercase">
                {{ new Date(race.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' }) }}
              </span>
              <span class="text-primary text-lg font-bold">
                {{ new Date(race.date + 'T00:00:00').getDate() }}
              </span>
            </div>

            <!-- Details -->
            <div class="min-w-0 flex-1">
              <div class="mb-1 flex items-start gap-2">
                <h3 class="text-default truncate text-sm font-semibold group-hover:text-primary transition-colors">
                  {{ race.name }}
                </h3>
              </div>

              <div class="text-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span class="flex items-center gap-1">
                  <UIcon name="i-lucide-map-pin" class="size-3" />
                  {{ race.city }}, {{ race.state }}
                </span>
                <UBadge variant="subtle" size="xs" color="primary">
                  {{ formatRaceType(race.raceType) }}
                </UBadge>
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
          <span class="text-muted text-sm">
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
