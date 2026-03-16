<script setup lang="ts">
useSeo({
  title: 'Sign In',
  description: 'Sign in to access your dashboard.',
})
useWebPageSchema({
  name: 'Sign In',
  description: 'Sign in to access your dashboard.',
})
definePageMeta({ middleware: ['guest'] })
</script>

<template>
  <div class="flex items-center justify-center min-h-[calc(100vh-8rem)]">
    <AuthLoginCard />
  </div>
</template>
