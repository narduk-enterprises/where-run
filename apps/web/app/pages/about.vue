<script setup lang="ts">
const { fetchRacesByState } = useRaces()

useSeo({
  title: 'About — Where Run',
  description:
    'Where Run aggregates running race data from across the United States to help runners discover their next event. Daily updates, 50 states, all distances.',
  keywords: [
    'about where run',
    'running race finder',
    'race aggregator',
    'running events platform',
    'find races',
  ],
  ogImage: {
    title: 'About Where Run',
    description: 'Race discovery platform',
    icon: 'i-lucide-info',
  },
})
useWebPageSchema({
  name: 'About Where Run',
  description: 'Learn about the Where Run race discovery platform.',
})

const { data: statesData } = fetchRacesByState()

const totalRaces = computed(() => {
  if (!statesData.value?.states) return 0
  return statesData.value.states.reduce((sum: number, s: { count: number }) => sum + s.count, 0)
})

const totalStates = computed(() => statesData.value?.states?.length || 0)

const steps = [
  {
    icon: 'i-lucide-database',
    title: 'Aggregate',
    description:
      'We automatically scrape race data from trusted sources like RunSignUp, updating our database daily with fresh events.',
  },
  {
    icon: 'i-lucide-filter',
    title: 'Organize',
    description:
      'Races are categorized by distance (5K, 10K, Half, Marathon, Ultra, Trail) and location across all 50 states plus DC.',
  },
  {
    icon: 'i-lucide-search',
    title: 'Discover',
    description:
      'Use our map-based search powered by Apple Maps to find races near you, or browse by state and distance type.',
  },
]

const techStack = [
  { name: 'Nuxt 4', icon: 'i-lucide-layout-template' },
  { name: 'Cloudflare Workers', icon: 'i-lucide-zap' },
  { name: 'D1 SQLite', icon: 'i-lucide-database' },
  { name: 'Apple MapKit', icon: 'i-lucide-map' },
  { name: 'Drizzle ORM', icon: 'i-lucide-layers' },
  { name: 'Nuxt UI 4', icon: 'i-lucide-palette' },
]
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
    <!-- Header -->
    <div class="mb-16 text-center">
      <div
        class="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2"
      >
        <UIcon name="i-lucide-info" class="text-primary size-4" />
        <span class="text-primary text-sm font-semibold">About</span>
      </div>
      <h1 class="text-default mb-4 text-4xl font-bold sm:text-5xl">About Where Run</h1>
      <p class="text-muted mx-auto max-w-xl text-lg">
        Helping runners discover their next race since 2026.
      </p>
    </div>

    <!-- Stats -->
    <div class="mb-16 grid grid-cols-3 gap-4">
      <div class="stat-card px-4 py-6">
        <div class="text-primary text-3xl font-bold sm:text-4xl">{{ totalRaces }}+</div>
        <div class="text-muted mt-1 text-sm">Races Listed</div>
      </div>
      <div class="stat-card px-4 py-6">
        <div class="text-primary text-3xl font-bold sm:text-4xl">{{ totalStates }}</div>
        <div class="text-muted mt-1 text-sm">States</div>
      </div>
      <div class="stat-card px-4 py-6">
        <div class="text-primary text-3xl font-bold sm:text-4xl">6</div>
        <div class="text-muted mt-1 text-sm">Race Types</div>
      </div>
    </div>

    <!-- Mission -->
    <div class="mb-12">
      <div class="card-base p-6 sm:p-8">
        <h2 class="text-default mb-4 flex items-center gap-2 text-xl font-bold">
          <UIcon name="i-lucide-target" class="text-primary size-6" />
          Our Mission
        </h2>
        <p class="text-muted leading-relaxed">
          Where Run makes it easy to discover running races across the United States. Whether you're
          training for your first 5K or your tenth ultra marathon, we aggregate race data from
          multiple sources so you can focus on what matters — finding the perfect race and lacing up
          your shoes.
        </p>
      </div>
    </div>

    <!-- How It Works -->
    <div class="mb-12">
      <h2 class="text-default mb-8 text-center text-2xl font-bold">How It Works</h2>
      <div class="grid gap-6 sm:grid-cols-3">
        <div
          v-for="(step, i) in steps"
          :key="step.title"
          class="card-base relative p-6 text-center"
        >
          <!-- Step number -->
          <div class="countdown-badge mx-auto mb-4">{{ i + 1 }}</div>
          <UIcon :name="step.icon" class="text-primary mx-auto mb-3 size-8" />
          <h3 class="text-default mb-2 font-bold">{{ step.title }}</h3>
          <p class="text-muted text-sm leading-relaxed">{{ step.description }}</p>
        </div>
      </div>
    </div>

    <!-- Built With -->
    <div class="mb-12">
      <div class="card-base p-6 sm:p-8">
        <h2 class="text-default mb-6 flex items-center gap-2 text-xl font-bold">
          <UIcon name="i-lucide-code-2" class="text-primary size-6" />
          Built With
        </h2>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div
            v-for="tech in techStack"
            :key="tech.name"
            class="flex items-center gap-3 rounded-xl bg-muted/50 p-3"
          >
            <UIcon :name="tech.icon" class="text-primary size-5" />
            <span class="text-default text-sm font-medium">{{ tech.name }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- CTA -->
    <div class="text-center">
      <div class="flex items-center justify-center gap-4">
        <NuxtLink to="/search">
          <UButton color="primary" size="lg" icon="i-lucide-search"> Start Finding Races </UButton>
        </NuxtLink>
        <NuxtLink to="/states">
          <UButton variant="outline" size="lg" icon="i-lucide-map"> Browse by State </UButton>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
