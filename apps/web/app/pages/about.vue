<script setup lang="ts">
useSeo({
  title: 'About — Where Run',
  description:
    'Where Run aggregates running race data from across the United States to help runners discover their next event.',
  ogImage: { title: 'About Where Run', description: 'Find races near you', icon: '🏃' },
})
useWebPageSchema({
  name: 'About Where Run',
  description: 'Learn about the Where Run race finder platform.',
})
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-16 sm:px-6">
    <div class="text-center mb-12">
      <div class="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
        <UIcon name="i-lucide-info" class="text-primary size-5" />
        <span class="text-primary text-sm font-semibold">About</span>
      </div>
      <h1 class="text-default text-4xl font-bold mb-4">About Where Run</h1>
      <p class="text-muted text-lg">
        Helping runners find their next race since 2026.
      </p>
    </div>

    <div class="space-y-8">
      <div class="card-base p-6 sm:p-8">
        <h2 class="text-default text-xl font-semibold mb-4 flex items-center gap-2">
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

      <div class="card-base p-6 sm:p-8">
        <h2 class="text-default text-xl font-semibold mb-4 flex items-center gap-2">
          <UIcon name="i-lucide-database" class="text-primary size-6" />
          How It Works
        </h2>
        <ul class="text-muted space-y-3">
          <li class="flex items-start gap-3">
            <UIcon name="i-lucide-check-circle" class="text-success mt-0.5 size-5 shrink-0" />
            <span>
              We automatically scrape race data from trusted sources like RunSignUp, updating our
              database daily with fresh events.
            </span>
          </li>
          <li class="flex items-start gap-3">
            <UIcon name="i-lucide-check-circle" class="text-success mt-0.5 size-5 shrink-0" />
            <span>
              Races are categorized by distance (5K, 10K, Half Marathon, Marathon, Ultra, Trail)
              and location across all 50 states plus DC.
            </span>
          </li>
          <li class="flex items-start gap-3">
            <UIcon name="i-lucide-check-circle" class="text-success mt-0.5 size-5 shrink-0" />
            <span>
              Use our map-based search powered by Apple Maps to find races near you, or browse by
              state and distance type.
            </span>
          </li>
        </ul>
      </div>

      <div class="card-base p-6 sm:p-8">
        <h2 class="text-default text-xl font-semibold mb-4 flex items-center gap-2">
          <UIcon name="i-lucide-code-2" class="text-primary size-6" />
          Built With
        </h2>
        <div class="flex flex-wrap gap-2">
          <UBadge variant="subtle" size="md">Nuxt 4</UBadge>
          <UBadge variant="subtle" size="md">Cloudflare Workers</UBadge>
          <UBadge variant="subtle" size="md">D1 SQLite</UBadge>
          <UBadge variant="subtle" size="md">Apple MapKit</UBadge>
          <UBadge variant="subtle" size="md">Drizzle ORM</UBadge>
          <UBadge variant="subtle" size="md">Nuxt UI 4</UBadge>
        </div>
      </div>
    </div>

    <div class="mt-12 text-center">
      <NuxtLink to="/search">
        <UButton color="primary" size="lg" icon="i-lucide-search">
          Start Finding Races
        </UButton>
      </NuxtLink>
    </div>
  </div>
</template>
