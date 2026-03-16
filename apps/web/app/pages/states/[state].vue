<script setup lang="ts">
const route = useRoute()
const stateCode = computed(() => String(route.params.state).toUpperCase())
const stateName = computed(() => STATE_NAMES[stateCode.value] || stateCode.value)

const { fetchRacesByStateCode } = useRaces()

// Fetch races for this state via composable
const { data, status } = await fetchRacesByStateCode(stateCode.value)

const stateRaces = computed(() => data.value?.races || [])
const stateTypes = computed(() => data.value?.types || [])
const total = computed(() => data.value?.total || 0)

// Dynamic SEO
useSeo({
  title: `Running Races in ${stateName.value} — Where Run`,
  description: `Find ${total.value || ''}${total.value ? ' ' : ''}upcoming running races in ${stateName.value}. Browse 5Ks, 10Ks, half marathons, marathons, ultras, and trail runs.`,
  keywords: [
    `running races ${stateName.value}`,
    `${stateName.value} 5K`,
    `${stateName.value} marathon`,
    `races in ${stateName.value}`,
    `${stateName.value} running events`,
    `${stateCode.value} races`,
  ],
  ogImage: {
    title: `Races in ${stateName.value}`,
    description: `${total.value}+ upcoming running races`,
    icon: 'i-lucide-map-pin',
  },
})
useWebPageSchema({
  name: `Running Races in ${stateName.value}`,
  description: `Browse upcoming running races in ${stateName.value}.`,
})

function daysUntil(dateStr: string) {
  const raceDate = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((raceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <!-- Breadcrumb -->
    <div
      class="mb-8 flex items-center gap-2 text-sm text-muted"
      role="navigation"
      aria-label="Breadcrumb"
    >
      <NuxtLink to="/" class="hover:text-default transition-colors cursor-pointer">Home</NuxtLink>
      <UIcon name="i-lucide-chevron-right" class="size-3 text-dimmed" />
      <NuxtLink to="/states" class="hover:text-default transition-colors cursor-pointer"
        >States</NuxtLink
      >
      <UIcon name="i-lucide-chevron-right" class="size-3 text-dimmed" />
      <span class="text-default font-medium">{{ stateName }}</span>
    </div>

    <!-- Header -->
    <div class="mb-10">
      <div class="mb-3 flex items-center gap-3">
        <UBadge variant="subtle" color="primary" size="lg">{{ stateCode }}</UBadge>
        <h1 class="text-default text-3xl font-bold sm:text-4xl">
          Running Races in {{ stateName }}
        </h1>
      </div>
      <p class="text-muted text-lg">
        <span class="text-primary font-bold">{{ total }}</span> upcoming
        {{ total === 1 ? 'race' : 'races' }} in {{ stateName }}
      </p>
    </div>

    <!-- Type badges -->
    <div v-if="stateTypes.length" class="mb-8 flex flex-wrap gap-2">
      <NuxtLink
        v-for="t in stateTypes"
        :key="t.type"
        :to="`/search?state=${stateCode}&raceType=${t.type}`"
        class="cursor-pointer"
      >
        <UBadge
          variant="outline"
          color="neutral"
          size="md"
          class="hover:border-primary transition-colors"
        >
          <UIcon :name="raceTypeIcon(t.type)" class="mr-1 size-3.5" />
          {{ formatRaceType(t.type) }} ({{ t.count }})
        </UBadge>
      </NuxtLink>
    </div>

    <!-- Loading -->
    <div v-if="status === 'pending'" class="flex items-center justify-center py-20">
      <UIcon name="i-lucide-loader-2" class="text-primary size-8 animate-spin" />
    </div>

    <!-- Empty state -->
    <div v-else-if="stateRaces.length === 0" class="py-20 text-center">
      <UIcon name="i-lucide-search-x" class="text-dimmed mx-auto mb-4 size-12" />
      <h2 class="text-default mb-2 text-lg font-semibold">No upcoming races in {{ stateName }}</h2>
      <p class="text-muted mb-6">Check back soon — we update our database daily.</p>
      <NuxtLink to="/search">
        <UButton color="primary" icon="i-lucide-search">Search All Races</UButton>
      </NuxtLink>
    </div>

    <!-- Race List -->
    <div v-else class="space-y-3">
      <NuxtLink
        v-for="race in stateRaces"
        :key="race.id"
        :to="`/race/${race.id}`"
        class="race-card group flex items-start gap-4 p-5 cursor-pointer"
      >
        <!-- Date badge -->
        <div class="flex w-16 shrink-0 flex-col items-center rounded-xl bg-primary/10 py-2.5">
          <span class="text-primary text-xs font-bold uppercase">
            {{ new Date(race.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' }) }}
          </span>
          <span class="text-primary text-xl font-bold">
            {{ new Date(race.date + 'T00:00:00').getDate() }}
          </span>
        </div>

        <!-- Details -->
        <div class="min-w-0 flex-1">
          <div class="mb-2 flex items-start justify-between gap-3">
            <h3 class="text-default text-base font-bold group-hover:text-primary transition-colors">
              {{ race.name }}
            </h3>
            <span class="countdown-badge shrink-0">
              {{ daysUntil(race.date) > 0 ? `${daysUntil(race.date)}d` : 'Today' }}
            </span>
          </div>

          <div class="text-muted flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span class="flex items-center gap-1.5">
              <UIcon name="i-lucide-calendar" class="size-3.5 text-dimmed" />
              {{ formatDate(race.date) }}
            </span>
            <span class="flex items-center gap-1.5">
              <UIcon name="i-lucide-map-pin" class="size-3.5 text-dimmed" />
              {{ race.city }}
            </span>
            <UBadge variant="subtle" size="xs" color="primary">
              {{ formatRaceType(race.raceType) }}
            </UBadge>
            <UBadge v-if="race.distanceMeters" variant="outline" size="xs" color="neutral">
              {{ formatDistance(race.distanceMeters) }}
            </UBadge>
          </div>

          <p v-if="race.description" class="text-muted mt-2 line-clamp-2 text-sm">
            {{ race.description }}
          </p>
        </div>

        <UIcon
          name="i-lucide-chevron-right"
          class="text-dimmed mt-1 size-4 shrink-0 transition-transform group-hover:translate-x-1"
        />
      </NuxtLink>
    </div>

    <!-- Back to states -->
    <div class="mt-10 flex items-center justify-center gap-4">
      <NuxtLink to="/states">
        <UButton variant="outline" icon="i-lucide-arrow-left">All States</UButton>
      </NuxtLink>
      <NuxtLink :to="`/search?state=${stateCode}`">
        <UButton color="primary" icon="i-lucide-search">Search {{ stateName }} Races</UButton>
      </NuxtLink>
    </div>
  </div>
</template>
