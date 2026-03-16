<script setup lang="ts">
const { fetchRaces, fetchRacesByState } = useRaces()

useSeo({
  title: 'Where Run — Find Running Races Near You',
  description:
    'Discover local running races across the United States. Search 5Ks, 10Ks, half marathons, marathons, ultras, and trail runs near you.',
  ogImage: {
    title: 'Where Run',
    description: 'Find Your Next Race',
    icon: '🏃',
  },
})
useWebPageSchema({
  name: 'Where Run — Running Race Finder',
  description: 'Discover and search for local running races across the United States.',
})

// Fetch featured upcoming races
const { data: featuredData } = fetchRaces({ limit: 6 })
const { data: statesData } = fetchRacesByState()

const raceTypes = [
  { type: '5k', label: '5K', icon: 'i-lucide-timer', color: 'text-success' },
  { type: '10k', label: '10K', icon: 'i-lucide-gauge', color: 'text-info' },
  { type: 'half', label: 'Half Marathon', icon: 'i-lucide-medal', color: 'text-warning' },
  { type: 'marathon', label: 'Marathon', icon: 'i-lucide-trophy', color: 'text-error' },
  { type: 'ultra', label: 'Ultra', icon: 'i-lucide-mountain', color: 'text-primary' },
  { type: 'trail', label: 'Trail', icon: 'i-lucide-trees', color: 'text-success' },
]

// Top states by race count (top 12)
const topStates = computed(() => {
  if (!statesData.value?.states) return []
  return statesData.value.states.slice(0, 12)
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
  <div class="min-h-screen">
    <!-- Hero Section -->
    <section class="relative overflow-hidden py-20 sm:py-28">
      <!-- Gradient background -->
      <div class="absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-primary/5" />
      <div
        class="absolute top-0 right-0 h-96 w-96 translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        class="absolute bottom-0 left-0 h-64 w-64 -translate-x-1/2 translate-y-1/2 rounded-full bg-primary/5 blur-2xl"
      />

      <div class="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div class="text-center">
          <div class="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
            <UIcon name="i-lucide-map-pin" class="text-primary size-5" />
            <span class="text-primary text-sm font-semibold">Race Finder</span>
          </div>

          <h1 class="text-default mb-6 text-5xl font-bold tracking-tight sm:text-7xl">
            Find Your
            <span class="bg-linear-to-r from-primary to-orange-400 bg-clip-text text-transparent">
              Next Race
            </span>
          </h1>

          <p class="text-muted mx-auto mb-10 max-w-2xl text-lg sm:text-xl">
            Discover running races across the United States. From local 5Ks to iconic marathons —
            find the perfect race for you.
          </p>

          <!-- Search box -->
          <div class="mx-auto max-w-xl">
            <NuxtLink to="/search">
              <div
                class="card-base flex items-center gap-3 p-4 transition-shadow hover:shadow-elevated"
              >
                <UIcon name="i-lucide-search" class="text-muted size-5" />
                <span class="text-dimmed text-left">Search for races by name, city, or state...</span>
                <UKbd class="ml-auto">⌘K</UKbd>
              </div>
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Race Types -->
    <section class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h2 class="text-default mb-8 text-center text-2xl font-bold">Browse by Distance</h2>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <NuxtLink
          v-for="rt in raceTypes"
          :key="rt.type"
          :to="`/search?raceType=${rt.type}`"
          class="card-base group flex flex-col items-center gap-3 p-6 transition-all hover:scale-105 hover:shadow-elevated"
        >
          <UIcon :name="rt.icon" :class="[rt.color, 'size-8 transition-transform group-hover:scale-110']" />
          <span class="text-default text-sm font-semibold">{{ rt.label }}</span>
        </NuxtLink>
      </div>
    </section>

    <!-- Featured Upcoming Races -->
    <section v-if="featuredData?.races?.length" class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div class="mb-8 flex items-center justify-between">
        <h2 class="text-default text-2xl font-bold">Upcoming Races</h2>
        <NuxtLink to="/search">
          <UButton variant="ghost" trailing-icon="i-lucide-arrow-right" color="primary">
            View All
          </UButton>
        </NuxtLink>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="race in featuredData.races"
          :key="race.id"
          :to="`/race/${race.id}`"
          class="card-base group overflow-hidden transition-all hover:shadow-elevated"
        >
          <!-- Color accent bar -->
          <div class="h-1 bg-linear-to-r from-primary to-orange-400" />
          <div class="p-5">
            <div class="mb-3 flex items-start justify-between gap-3">
              <h3 class="text-default line-clamp-2 text-base font-semibold group-hover:text-primary transition-colors">
                {{ race.name }}
              </h3>
              <UBadge variant="subtle" color="primary" class="shrink-0">
                {{ formatRaceType(race.raceType) }}
              </UBadge>
            </div>

            <div class="text-muted flex flex-col gap-2 text-sm">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-calendar" class="text-dimmed size-4" />
                <span>{{ formatDate(race.date) }}</span>
              </div>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-map-pin" class="text-dimmed size-4" />
                <span>{{ race.city }}, {{ race.state }}</span>
              </div>
            </div>
          </div>
        </NuxtLink>
      </div>
    </section>

    <!-- Browse by State -->
    <section v-if="topStates.length" class="bg-muted/30 py-12">
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <div class="mb-8 flex items-center justify-between">
          <h2 class="text-default text-2xl font-bold">Browse by State</h2>
          <NuxtLink to="/search">
            <UButton variant="ghost" trailing-icon="i-lucide-arrow-right" color="primary">
              All States
            </UButton>
          </NuxtLink>
        </div>

        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <NuxtLink
            v-for="st in topStates"
            :key="st.state"
            :to="`/search?state=${st.state}`"
            class="card-base group flex items-center justify-between p-4 transition-all hover:shadow-elevated"
          >
            <div>
              <div class="text-default text-sm font-semibold">
                {{ STATE_NAMES[st.state] || st.state }}
              </div>
              <div class="text-dimmed text-xs">
                {{ st.count }} {{ st.count === 1 ? 'race' : 'races' }}
              </div>
            </div>
            <UIcon
              name="i-lucide-chevron-right"
              class="text-dimmed size-4 transition-transform group-hover:translate-x-1"
            />
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
      <h2 class="text-default mb-4 text-3xl font-bold">Ready to Find Your Race?</h2>
      <p class="text-muted mb-8 text-lg">
        We aggregate race data from across the country so you never miss a local event.
      </p>
      <NuxtLink to="/search">
        <UButton size="xl" color="primary" icon="i-lucide-search">
          Search Races
        </UButton>
      </NuxtLink>
    </section>
  </div>
</template>
