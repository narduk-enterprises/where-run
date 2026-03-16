<template>
  <div class="border-t border-default bg-muted/30">
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div class="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <!-- Brand -->
        <div class="flex items-center gap-2">
          <div class="flex size-6 items-center justify-center rounded-md bg-primary">
            <UIcon name="i-lucide-map-pin" class="size-3 text-white" />
          </div>
          <span class="font-display text-sm font-bold text-default">Where Run</span>
        </div>

        <!-- Links -->
        <nav class="flex items-center gap-4 text-sm text-muted" aria-label="Footer navigation">
          <NuxtLink to="/search" class="transition-colors hover:text-default cursor-pointer">
            Search Races
          </NuxtLink>
          <NuxtLink to="/states" class="transition-colors hover:text-default cursor-pointer">
            Browse by State
          </NuxtLink>
          <NuxtLink to="/about" class="transition-colors hover:text-default cursor-pointer">
            About
          </NuxtLink>
        </nav>

        <!-- Copyright -->
        <p class="text-xs text-dimmed">
          © {{ new Date().getFullYear() }} Where Run. Race data updated daily.
        </p>
      </div>
    </div>
  </div>
</template>
