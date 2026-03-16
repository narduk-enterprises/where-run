<script setup lang="ts">
const route = useRoute()
const raceId = computed(() => String(route.params.id))

const { fetchRaceById, fetchNearbyRaces } = useRaces()
const { toMapItems, createRacePin, defaultCenter } = useRaceMap()

const { data: raceData, status } = fetchRaceById(raceId.value)

const race = computed(() => raceData.value?.race)

// Dynamic SEO
watchEffect(() => {
  if (!race.value) return
  useSeo({
    title: `${race.value.name} — Where Run`,
    description: `${race.value.name} on ${formatDate(race.value.date)} in ${race.value.city}, ${race.value.state}. ${formatRaceType(race.value.raceType)} race.`,
    ogImage: {
      title: race.value.name,
      description: `${formatRaceType(race.value.raceType)} · ${race.value.city}, ${race.value.state}`,
      icon: '🏃',
    },
  })
  useWebPageSchema({
    name: race.value.name,
    description: `${formatRaceType(race.value.raceType)} running race in ${race.value.city}, ${race.value.state}`,
  })
})

// Fetch nearby races
const { data: nearbyData } = fetchNearbyRaces(
  race.value?.latitude || 0,
  race.value?.longitude || 0,
  50,
)

const nearbyRaces = computed(() => {
  if (!nearbyData.value?.races) return []
  // Filter out the current race
  return nearbyData.value.races.filter((r) => r.id !== raceId.value).slice(0, 6)
})

// Map items for single race
const singleRaceMap = computed(() => {
  if (!race.value) return []
  return toMapItems([race.value])
})

const raceMapCenter = computed(() => {
  if (!race.value) return defaultCenter
  return { lat: race.value.latitude, lng: race.value.longitude }
})

function formatDate(dateStr: string) {
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
  <div class="min-h-screen">
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
      <!-- Map -->
      <div class="relative h-[300px] w-full sm:h-[350px]">
        <ClientOnly>
          <AppMapKit
            :items="singleRaceMap"
            :create-pin-element="createRacePin"
            :fallback-center="raceMapCenter"
            :zoom-span="{ lat: 0.1, lng: 0.1 }"
            class="h-full w-full"
          />
          <template #fallback>
            <div class="flex h-full items-center justify-center bg-muted">
              <UIcon name="i-lucide-map" class="text-dimmed size-12" />
            </div>
          </template>
        </ClientOnly>

        <!-- Back button overlay -->
        <div class="absolute top-4 left-4">
          <NuxtLink to="/search">
            <UButton variant="solid" color="neutral" icon="i-lucide-arrow-left" size="sm">
              Back
            </UButton>
          </NuxtLink>
        </div>
      </div>

      <!-- Content -->
      <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <!-- Header -->
        <div class="mb-8">
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <UBadge variant="subtle" color="primary" size="md">
              <UIcon :name="raceTypeIcon(race.raceType)" class="mr-1 size-3.5" />
              {{ formatRaceType(race.raceType) }}
            </UBadge>
            <UBadge v-if="race.distanceMeters" variant="outline" color="neutral" size="md">
              {{ formatDistance(race.distanceMeters) }}
            </UBadge>
            <UBadge v-if="race.isVirtual" variant="subtle" color="info" size="md">
              Virtual
            </UBadge>
          </div>

          <h1 class="text-default mb-4 text-3xl font-bold sm:text-4xl">{{ race.name }}</h1>

          <!-- Key details -->
          <div class="text-muted flex flex-wrap gap-x-6 gap-y-2 text-base">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-calendar" class="text-primary size-5" />
              <span>{{ formatDate(race.date) }}</span>
            </div>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-map-pin" class="text-primary size-5" />
              <span>{{ race.city }}, {{ STATE_NAMES[race.state] || race.state }}</span>
            </div>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="mb-8 flex flex-wrap gap-3">
          <UButton
            v-if="race.registrationUrl"
            tag="a"
            :href="race.registrationUrl"
            target="_blank"
            color="primary"
            size="lg"
            icon="i-lucide-external-link"
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
        </div>

        <!-- Description -->
        <div v-if="race.description" class="mb-8">
          <h2 class="text-default mb-3 text-xl font-semibold">About This Race</h2>
          <div class="card-base p-5">
            <p class="text-muted whitespace-pre-line leading-relaxed">{{ race.description }}</p>
          </div>
        </div>

        <USeparator class="my-8" />

        <!-- Nearby Races -->
        <div v-if="nearbyRaces.length">
          <h2 class="text-default mb-4 text-xl font-semibold">Nearby Races</h2>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <NuxtLink
              v-for="nearby in nearbyRaces"
              :key="nearby.id"
              :to="`/race/${nearby.id}`"
              class="card-base group p-4 transition-all hover:shadow-elevated"
            >
              <h3 class="text-default mb-2 line-clamp-2 text-sm font-semibold group-hover:text-primary transition-colors">
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
