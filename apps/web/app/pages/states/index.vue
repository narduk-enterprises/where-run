<script setup lang="ts">
const { fetchRacesByState } = useRaces()

useSeo({
  title: 'Running Races by State — Where Run',
  description:
    'Browse running races across all 50 US states and DC. Find 5Ks, 10Ks, half marathons, marathons, ultras, and trail runs in every state.',
  keywords: ['running races by state', 'races near me', 'state running events', 'US running races', 'find races', 'local running events'],
  ogImage: {
    title: 'Browse Races by State',
    description: 'Running races across all 50 states',
    icon: 'i-lucide-map',
  },
})
useWebPageSchema({
  name: 'Running Races by State',
  description: 'Browse running races across all 50 US states and DC.',
})

const { data } = fetchRacesByState()

const stateList = computed(() => {
  if (!data.value?.states) return []
  return data.value.states
    .map((s: { state: string; count: number }) => ({
      ...s,
      name: STATE_NAMES[s.state] || s.state,
    }))
    .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name))
})

const totalRaces = computed(() => {
  if (!data.value?.states) return 0
  return data.value.states.reduce((sum: number, s: { count: number }) => sum + s.count, 0)
})
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
    <!-- Header -->
    <div class="mb-12 text-center">
      <div class="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
        <UIcon name="i-lucide-map" class="text-primary size-4" />
        <span class="text-primary text-sm font-semibold">All States</span>
      </div>
      <h1 class="text-default mb-4 text-4xl font-bold sm:text-5xl">Running Races by State</h1>
      <p class="text-muted mx-auto max-w-xl text-lg">
        Explore <span class="text-primary font-bold">{{ totalRaces }}+</span> upcoming races across
        <span class="text-primary font-bold">{{ stateList.length }}</span> states and DC.
      </p>
    </div>

    <!-- State Grid -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <NuxtLink
        v-for="st in stateList"
        :key="st.state"
        :to="`/states/${st.state.toLowerCase()}`"
        class="card-base group flex items-center justify-between p-4 cursor-pointer"
      >
        <div>
          <div class="text-default font-bold group-hover:text-primary transition-colors">
            {{ st.name }}
          </div>
          <div class="text-dimmed text-sm">
            {{ st.count }} {{ st.count === 1 ? 'race' : 'races' }}
          </div>
        </div>
        <div class="flex items-center gap-2">
          <UBadge variant="subtle" color="primary" size="xs">{{ st.state }}</UBadge>
          <UIcon
            name="i-lucide-chevron-right"
            class="text-dimmed size-4 transition-transform group-hover:translate-x-1"
          />
        </div>
      </NuxtLink>
    </div>

    <!-- CTA -->
    <div class="mt-12 text-center">
      <NuxtLink to="/search">
        <UButton color="primary" size="lg" icon="i-lucide-search">
          Search All Races
        </UButton>
      </NuxtLink>
    </div>
  </div>
</template>
