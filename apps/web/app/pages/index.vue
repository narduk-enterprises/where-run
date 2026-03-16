<script setup lang="ts">
const config = useRuntimeConfig()
const appName = config.public.appName || 'Our App'

useSeo({
  title: `${appName} — Coming Soon`,
  description: `${appName} is launching soon. Something amazing is on the way.`,
})
useWebPageSchema({
  name: `${appName} — Coming Soon`,
  description: `${appName} is launching soon. Something amazing is on the way.`,
})

const features = [
  {
    icon: 'i-lucide-zap',
    title: 'Lightning Fast',
    description: 'Deployed on the edge for sub-50ms responses worldwide.',
  },
  {
    icon: 'i-lucide-palette',
    title: 'Beautiful Design',
    description: 'Crafted with care using modern design principles.',
  },
  {
    icon: 'i-lucide-shield-check',
    title: 'Enterprise Ready',
    description: 'Built on production-grade infrastructure from day one.',
  },
]
</script>

<template>
  <UPage>
    <UPageHero
      :title="appName"
      description="Something amazing is on the way."
      :ui="{ title: 'text-5xl sm:text-6xl', description: 'text-xl text-muted' }"
    >
      <template #links>
        <UBadge
          color="primary"
          variant="subtle"
          size="lg"
          label="Coming Soon"
          icon="i-lucide-rocket"
        />
      </template>
    </UPageHero>

    <UPageGrid>
      <UPageCard
        v-for="feature in features"
        :key="feature.title"
        :icon="feature.icon"
        :title="feature.title"
        :description="feature.description"
      />
    </UPageGrid>

    <UPageSection :ui="{ wrapper: 'py-16 sm:py-24 text-center' }">
      <p class="text-lg text-muted mb-2">Stay tuned — we're building something great.</p>
      <p class="text-sm text-dimmed">Powered by Nuxt 4 &amp; Cloudflare Workers</p>
    </UPageSection>
  </UPage>
</template>
