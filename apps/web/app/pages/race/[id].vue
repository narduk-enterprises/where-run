<script setup lang="ts">
const route = useRoute()
const raceId = computed(() => String(route.params.id))

const { fetchRaceById, fetchNearbyRaces } = useRaces()
const { toMapItems, createRacePin, defaultCenter } = useRaceMap()

// Use await so SSR waits for data before rendering meta tags
const { data: raceData, status } = await fetchRaceById(raceId.value)

const race = computed(() => raceData.value?.race)

// SEO — evaluated during SSR since data is awaited
const seoTitle = computed(() =>
  race.value ? `${race.value.name} — Where Run` : 'Race — Where Run',
)
const seoDesc = computed(() =>
  race.value
    ? `${race.value.name} on ${formatDateLong(race.value.date)} in ${race.value.city}, ${STATE_NAMES[race.value.state] || race.value.state}. Register for this ${formatRaceType(race.value.raceType)} race.`
    : 'Find running races across the United States.',
)

useSeo({
  title: seoTitle.value,
  description: seoDesc.value,
  keywords: race.value
    ? [
        race.value.name,
        `${race.value.city} ${formatRaceType(race.value.raceType)}`,
        `${STATE_NAMES[race.value.state]} running race`,
        `${formatRaceType(race.value.raceType)} race`,
        `running race ${race.value.city}`,
      ]
    : ['running races', 'race finder'],
  ogImage: {
    title: race.value?.name || 'Race Details',
    description: race.value
      ? `${formatRaceType(race.value.raceType)} · ${race.value.city}, ${race.value.state}`
      : 'Where Run',
    icon: 'i-lucide-trophy',
  },
})

if (race.value) {
  useSchemaOrg([
    {
      '@type': 'SportsEvent',
      name: race.value.name,
      startDate: race.value.date,
      location: {
        '@type': 'Place',
        name: `${race.value.city}, ${STATE_NAMES[race.value.state] || race.value.state}`,
        address: {
          '@type': 'PostalAddress',
          addressLocality: race.value.city,
          addressRegion: race.value.state,
          addressCountry: 'US',
        },
      },
      ...(race.value.url && { url: race.value.url }),
      ...(race.value.description && { description: race.value.description }),
      sport: 'Running',
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://where-run.nard.uk/' },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Search',
          item: 'https://where-run.nard.uk/search',
        },
        { '@type': 'ListItem', position: 3, name: race.value.name },
      ],
    },
  ])
}

useWebPageSchema({
  name: seoTitle.value,
  description: seoDesc.value,
})

// Fetch nearby races
const { data: nearbyData } = fetchNearbyRaces(
  race.value?.latitude || 0,
  race.value?.longitude || 0,
  50,
)

const nearbyRaces = computed(() => {
  if (!nearbyData.value?.races) return []
  return nearbyData.value.races.filter((r) => r.id !== raceId.value).slice(0, 6)
})

const singleRaceMap = computed(() => {
  if (!race.value) return []
  return toMapItems([race.value])
})

const raceMapCenter = computed(() => {
  if (!race.value) return defaultCenter
  return { lat: race.value.latitude, lng: race.value.longitude }
})

function daysUntil(dateStr: string) {
  const raceDate = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((raceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDateLong(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="status === 'pending'" class="flex min-h-[60vh] items-center justify-center">
      <UIcon name="i-lucide-loader-2" class="text-primary size-10 animate-spin" />
    </div>

    <!-- Not found -->
    <div v-else-if="!race" class="flex min-h-[60vh] flex-col items-center justify-center p-8">
      <UIcon name="i-lucide-search-x" class="text-dimmed mb-4 size-16" />
      <h1 class="text-default mb-2 text-2xl font-bold">Race Not Found</h1>
      <p class="text-muted mb-6">This race doesn't exist or has been removed.</p>
      <NuxtLink to="/search">
        <UButton color="primary" icon="i-lucide-arrow-left">Back to Search</UButton>
      </NuxtLink>
    </div>

    <!-- Race Detail -->
    <div v-else>
      <!-- Map Hero with Overlay -->
      <div class="relative h-[280px] w-full sm:h-[320px]">
        <ClientOnly>
          <AppMapKit
            :items="singleRaceMap"
            :create-pin-element="createRacePin"
            :fallback-center="raceMapCenter"
            :zoom-span="{ lat: 0.08, lng: 0.08 }"
            class="h-full w-full"
          />
          <template #fallback>
            <div class="flex h-full items-center justify-center bg-muted">
              <UIcon name="i-lucide-map" class="text-dimmed size-12" />
            </div>
          </template>
        </ClientOnly>

        <!-- Gradient overlay at bottom -->
        <div
          class="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-default to-transparent"
        />

        <!-- Back button -->
        <div class="absolute top-4 left-4">
          <NuxtLink to="/search">
            <UButton
              variant="solid"
              color="neutral"
              icon="i-lucide-arrow-left"
              size="sm"
              class="shadow-elevated"
            >
              Back
            </UButton>
          </NuxtLink>
        </div>
      </div>

      <!-- Content -->
      <div class="mx-auto max-w-4xl px-4 sm:px-6" style="margin-top: -2rem">
        <!-- Breadcrumb -->
        <div
          class="mb-4 flex items-center gap-2 text-xs text-muted"
          role="navigation"
          aria-label="Breadcrumb"
        >
          <NuxtLink to="/" class="hover:text-default transition-colors cursor-pointer"
            >Home</NuxtLink
          >
          <UIcon name="i-lucide-chevron-right" class="size-3 text-dimmed" />
          <NuxtLink to="/search" class="hover:text-default transition-colors cursor-pointer"
            >Search</NuxtLink
          >
          <UIcon name="i-lucide-chevron-right" class="size-3 text-dimmed" />
          <span class="text-default font-medium truncate max-w-[200px]">{{ race.name }}</span>
        </div>

        <!-- Header Card -->
        <div class="card-base p-6 sm:p-8 mb-6">
          <!-- Badges -->
          <div class="mb-4 flex flex-wrap items-center gap-2">
            <UBadge variant="subtle" color="primary" size="md">
              <UIcon :name="raceTypeIcon(race.raceType)" class="mr-1 size-3.5" />
              {{ formatRaceType(race.raceType) }}
            </UBadge>
            <UBadge v-if="race.distanceMeters" variant="outline" color="neutral" size="md">
              {{ formatDistance(race.distanceMeters) }}
            </UBadge>
            <UBadge v-if="race.isVirtual" variant="subtle" color="info" size="md"> Virtual </UBadge>
            <span class="countdown-badge ml-auto">
              <UIcon name="i-lucide-clock" class="size-3" />
              {{ daysUntil(race.date) > 0 ? `${daysUntil(race.date)} days away` : 'Race Day!' }}
            </span>
          </div>

          <h1 class="text-default mb-5 text-3xl font-bold sm:text-4xl">{{ race.name }}</h1>

          <!-- Key Facts Grid -->
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div class="rounded-xl bg-muted/50 p-3 text-center">
              <UIcon name="i-lucide-calendar" class="text-primary mx-auto mb-1 size-5" />
              <div class="text-default text-sm font-bold">{{ formatShortDate(race.date) }}</div>
              <div class="text-dimmed text-xs">Date</div>
            </div>
            <div class="rounded-xl bg-muted/50 p-3 text-center">
              <UIcon name="i-lucide-map-pin" class="text-primary mx-auto mb-1 size-5" />
              <div class="text-default text-sm font-bold">{{ race.city }}</div>
              <div class="text-dimmed text-xs">{{ STATE_NAMES[race.state] || race.state }}</div>
            </div>
            <div class="rounded-xl bg-muted/50 p-3 text-center">
              <UIcon :name="raceTypeIcon(race.raceType)" class="text-primary mx-auto mb-1 size-5" />
              <div class="text-default text-sm font-bold">{{ formatRaceType(race.raceType) }}</div>
              <div class="text-dimmed text-xs">Type</div>
            </div>
            <div class="rounded-xl bg-muted/50 p-3 text-center">
              <UIcon name="i-lucide-ruler" class="text-primary mx-auto mb-1 size-5" />
              <div class="text-default text-sm font-bold">
                {{ race.distanceMeters ? formatDistance(race.distanceMeters) : '—' }}
              </div>
              <div class="text-dimmed text-xs">Distance</div>
            </div>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="mb-6 flex flex-wrap gap-3">
          <UButton
            v-if="race.registrationUrl"
            tag="a"
            :href="race.registrationUrl"
            target="_blank"
            color="primary"
            size="lg"
            icon="i-lucide-external-link"
            class="font-bold"
          >
            Register Now
          </UButton>
          <UButton
            v-if="race.url"
            tag="a"
            :href="race.url"
            target="_blank"
            variant="outline"
            size="lg"
            icon="i-lucide-globe"
          >
            Race Website
          </UButton>
          <NuxtLink :to="`/states/${race.state.toLowerCase()}`">
            <UButton variant="ghost" size="lg" icon="i-lucide-map">
              More {{ STATE_NAMES[race.state] }} Races
            </UButton>
          </NuxtLink>
        </div>

        <!-- Description -->
        <div v-if="race.description" class="mb-8">
          <h2 class="text-default mb-3 text-xl font-bold">About This Race</h2>
          <div class="card-base p-5">
            <p class="text-muted whitespace-pre-line leading-relaxed">{{ race.description }}</p>
          </div>
        </div>

        <USeparator class="my-8" />

        <!-- Nearby Races -->
        <div v-if="nearbyRaces.length" class="mb-8">
          <h2 class="text-default mb-4 text-xl font-bold">Nearby Races</h2>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <NuxtLink
              v-for="nearby in nearbyRaces"
              :key="nearby.id"
              :to="`/race/${nearby.id}`"
              class="card-base group p-4 cursor-pointer"
            >
              <h3
                class="text-default mb-2 line-clamp-2 text-sm font-bold group-hover:text-primary transition-colors"
              >
                {{ nearby.name }}
              </h3>
              <div class="text-muted flex items-center gap-3 text-xs">
                <span>{{ formatShortDate(nearby.date) }}</span>
                <UBadge variant="subtle" size="xs" color="primary">
                  {{ formatRaceType(nearby.raceType) }}
                </UBadge>
              </div>
              <div v-if="nearby.distanceMiles" class="text-dimmed mt-1 text-xs">
                {{ nearby.distanceMiles }} mi away
              </div>
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
