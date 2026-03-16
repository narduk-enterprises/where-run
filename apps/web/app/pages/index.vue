<script setup lang="ts">
const { fetchRaces, fetchRacesByState } = useRaces()

useSeo({
  title: 'Where Run — Find Running Races Near You',
  description:
    'Discover local running races across the United States. Search 5Ks, 10Ks, half marathons, marathons, ultras, and trail runs near you.',
  keywords: ['running races', 'race finder', '5K', '10K', 'half marathon', 'marathon', 'trail run', 'race search', 'local races', 'running events'],
  ogImage: {
    title: 'Where Run',
    description: 'Find Your Next Race',
    icon: 'i-lucide-trophy',
  },
})
useWebPageSchema({
  name: 'Where Run — Running Race Finder',
  description: 'Discover and search for local running races across the United States.',
})

const { data: featuredData } = fetchRaces({ limit: 6 })
const { data: statesData } = fetchRacesByState()

const raceTypes = [
  { type: '5k', label: '5K', icon: 'i-lucide-timer', description: 'Quick & fun' },
  { type: '10k', label: '10K', icon: 'i-lucide-gauge', description: 'The sweet spot' },
  { type: 'half', label: 'Half Marathon', icon: 'i-lucide-medal', description: '13.1 miles' },
  { type: 'marathon', label: 'Marathon', icon: 'i-lucide-trophy', description: '26.2 miles' },
  { type: 'ultra', label: 'Ultra', icon: 'i-lucide-mountain', description: 'Beyond 26.2' },
  { type: 'trail', label: 'Trail', icon: 'i-lucide-trees', description: 'Off-road' },
]

const topStates = computed(() => {
  if (!statesData.value?.states) return []
  return statesData.value.states.slice(0, 12)
})

const totalRaces = computed(() => {
  if (!statesData.value?.states) return 0
  return statesData.value.states.reduce((sum: number, s: { count: number }) => sum + s.count, 0)
})

const totalStates = computed(() => statesData.value?.states?.length || 0)

function daysUntil(dateStr: string) {
  const raceDate = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((raceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}
</script>

<template>
  <div>
    <!-- Hero Section -->
    <section class="relative overflow-hidden py-20 sm:py-32">
      <!-- Animated gradient background -->
      <div class="animate-gradient absolute inset-0 bg-linear-to-br from-primary/15 via-transparent to-primary/5" />
      <div class="absolute top-0 right-0 h-[500px] w-[500px] translate-x-1/3 -translate-y-1/3 rounded-full bg-primary/8 blur-3xl" />
      <div class="absolute bottom-0 left-0 h-80 w-80 -translate-x-1/3 translate-y-1/3 rounded-full bg-primary/5 blur-3xl" />

      <div class="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div class="text-center">
          <div class="animate-fade-up mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-5 py-2">
            <UIcon name="i-lucide-map-pin" class="text-primary size-4" />
            <span class="text-primary text-sm font-semibold tracking-wide uppercase">Race Finder</span>
          </div>

          <h1 class="animate-fade-up animate-fade-up-delay-1 mb-6 text-5xl font-bold tracking-tight sm:text-7xl lg:text-8xl">
            <span class="text-default">Find Your</span>
            <br />
            <span class="gradient-text-warm">Next Race</span>
          </h1>

          <p class="animate-fade-up animate-fade-up-delay-2 text-muted mx-auto mb-10 max-w-2xl text-lg sm:text-xl leading-relaxed">
            Discover running races across the United States. From local 5Ks to iconic marathons — find the perfect race and lace up.
          </p>

          <!-- Search CTA -->
          <div class="animate-fade-up animate-fade-up-delay-3 mx-auto max-w-xl">
            <NuxtLink to="/search" class="cursor-pointer">
              <div class="gradient-border card-base group flex items-center gap-3 p-4 transition-all hover:shadow-overlay">
                <UIcon name="i-lucide-search" class="text-muted size-5 group-hover:text-primary transition-colors" />
                <span class="text-dimmed text-left flex-1">Search by name, city, or state...</span>
                <UKbd class="hidden sm:inline-flex">⌘K</UKbd>
                <UIcon name="i-lucide-arrow-right" class="text-dimmed size-4 transition-transform group-hover:translate-x-1" />
              </div>
            </NuxtLink>
          </div>
        </div>

        <!-- Stats Bar -->
        <div class="mt-16 grid grid-cols-3 gap-4 sm:gap-8">
          <div class="stat-card px-4 py-5">
            <div class="text-primary text-3xl font-bold sm:text-4xl">{{ totalRaces }}+</div>
            <div class="text-muted mt-1 text-sm">Races Listed</div>
          </div>
          <div class="stat-card px-4 py-5">
            <div class="text-primary text-3xl font-bold sm:text-4xl">{{ totalStates }}</div>
            <div class="text-muted mt-1 text-sm">States Covered</div>
          </div>
          <div class="stat-card px-4 py-5">
            <div class="text-primary text-3xl font-bold sm:text-4xl">6</div>
            <div class="text-muted mt-1 text-sm">Race Types</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Race Types -->
    <section class="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h2 class="mb-2 text-center text-3xl font-bold text-default">Browse by Distance</h2>
      <p class="text-muted mb-10 text-center">Find races that match your training goals</p>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <NuxtLink
          v-for="rt in raceTypes"
          :key="rt.type"
          :to="`/search?raceType=${rt.type}`"
          class="race-card group flex flex-col items-center gap-3 p-6 cursor-pointer"
        >
          <div class="flex size-14 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20">
            <UIcon :name="rt.icon" class="text-primary size-7" />
          </div>
          <div class="text-center">
            <div class="text-default text-sm font-bold">{{ rt.label }}</div>
            <div class="text-dimmed text-xs mt-0.5">{{ rt.description }}</div>
          </div>
        </NuxtLink>
      </div>
    </section>

    <!-- Featured Upcoming Races -->
    <section v-if="featuredData?.races?.length" class="bg-muted/20 py-16">
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <div class="mb-10 flex items-end justify-between">
          <div>
            <h2 class="text-default text-3xl font-bold">Upcoming Races</h2>
            <p class="text-muted mt-1">Don't miss these upcoming events</p>
          </div>
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
            class="race-card group cursor-pointer"
          >
            <!-- Gradient accent bar -->
            <div class="h-1 bg-linear-to-r from-primary to-primary/40" />
            <div class="p-5">
              <!-- Top row: countdown + type -->
              <div class="mb-3 flex items-center justify-between">
                <span class="countdown-badge">
                  <UIcon name="i-lucide-clock" class="size-3" />
                  {{ daysUntil(race.date) > 0 ? `In ${daysUntil(race.date)} days` : 'Today!' }}
                </span>
                <UBadge variant="subtle" color="primary" size="xs">
                  {{ formatRaceType(race.raceType) }}
                </UBadge>
              </div>

              <h3 class="text-default mb-3 line-clamp-2 text-base font-bold group-hover:text-primary transition-colors">
                {{ race.name }}
              </h3>

              <div class="text-muted flex items-center gap-4 text-sm">
                <span class="flex items-center gap-1.5">
                  <UIcon name="i-lucide-calendar" class="text-dimmed size-3.5" />
                  {{ formatDate(race.date) }}
                </span>
                <span class="flex items-center gap-1.5">
                  <UIcon name="i-lucide-map-pin" class="text-dimmed size-3.5" />
                  {{ race.city }}, {{ race.state }}
                </span>
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Browse by State -->
    <section v-if="topStates.length" class="py-16">
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <div class="mb-10 flex items-end justify-between">
          <div>
            <h2 class="text-default text-3xl font-bold">Browse by State</h2>
            <p class="text-muted mt-1">Explore races across the country</p>
          </div>
          <NuxtLink to="/states">
            <UButton variant="ghost" trailing-icon="i-lucide-arrow-right" color="primary">
              All States
            </UButton>
          </NuxtLink>
        </div>

        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <NuxtLink
            v-for="st in topStates"
            :key="st.state"
            :to="`/states/${st.state.toLowerCase()}`"
            class="card-base group flex items-center justify-between p-4 cursor-pointer"
          >
            <div>
              <div class="text-default text-sm font-bold group-hover:text-primary transition-colors">
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
    <section class="relative overflow-hidden py-20">
      <div class="absolute inset-0 bg-linear-to-r from-primary/10 to-primary/5" />
      <div class="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h2 class="text-default mb-4 text-3xl font-bold sm:text-4xl">Ready to Find Your Race?</h2>
        <p class="text-muted mb-8 text-lg max-w-xl mx-auto">
          We aggregate race data from across the country, updated daily, so you never miss a local event.
        </p>
        <div class="flex items-center justify-center gap-4">
          <NuxtLink to="/search">
            <UButton size="xl" color="primary" icon="i-lucide-search">
              Search Races
            </UButton>
          </NuxtLink>
          <NuxtLink to="/states">
            <UButton size="xl" variant="outline" icon="i-lucide-map">
              Browse States
            </UButton>
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
