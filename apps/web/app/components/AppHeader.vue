<script setup lang="ts">
const route = useRoute()

const navLinks = [
  { label: 'Home', to: '/', icon: 'i-lucide-home' },
  { label: 'Search', to: '/search', icon: 'i-lucide-search' },
  { label: 'States', to: '/states', icon: 'i-lucide-map' },
  { label: 'About', to: '/about', icon: 'i-lucide-info' },
]

const mobileMenuOpen = ref(false)

function isActive(to: string) {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}
</script>

<template>
  <div class="sticky top-0 z-40 border-b border-default bg-default/80 backdrop-blur-xl">
    <div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
      <!-- Logo -->
      <NuxtLink to="/" class="flex items-center gap-2.5 cursor-pointer">
        <div class="flex size-8 items-center justify-center rounded-lg bg-primary">
          <UIcon name="i-lucide-map-pin" class="size-4.5 text-white" />
        </div>
        <span class="font-display text-lg font-bold text-default tracking-tight"> Where Run </span>
      </NuxtLink>

      <!-- Desktop Nav -->
      <div class="hidden items-center gap-1 sm:flex" role="navigation" aria-label="Main navigation">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer"
          :class="
            isActive(link.to)
              ? 'bg-primary/10 text-primary'
              : 'text-muted hover:text-default hover:bg-elevated'
          "
        >
          <UIcon :name="link.icon" class="size-4" />
          {{ link.label }}
        </NuxtLink>
      </div>

      <!-- Mobile Menu Button -->
      <UButton
        class="sm:hidden"
        variant="ghost"
        :icon="mobileMenuOpen ? 'i-lucide-x' : 'i-lucide-menu'"
        size="sm"
        @click="mobileMenuOpen = !mobileMenuOpen"
        aria-label="Toggle menu"
      />
    </div>

    <!-- Mobile Nav -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      leave-active-class="transition-all duration-150 ease-in"
      enter-from-class="opacity-0 -translate-y-2"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="mobileMenuOpen"
        class="border-t border-default bg-default px-4 py-3 sm:hidden"
        role="navigation"
        aria-label="Mobile navigation"
      >
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer"
          :class="
            isActive(link.to)
              ? 'bg-primary/10 text-primary'
              : 'text-muted hover:text-default hover:bg-elevated'
          "
          @click="mobileMenuOpen = false"
        >
          <UIcon :name="link.icon" class="size-4" />
          {{ link.label }}
        </NuxtLink>
      </div>
    </Transition>
  </div>
</template>
