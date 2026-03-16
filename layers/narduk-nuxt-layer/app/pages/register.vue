<script setup lang="ts">
useSeo({
  title: 'Create an Account',
  description: 'Sign up to get started.',
})
useWebPageSchema({
  name: 'Create an Account',
  description: 'Sign up to get started.',
})
definePageMeta({ middleware: ['guest'] })
</script>

<template>
  <div class="flex items-center justify-center min-h-[calc(100vh-8rem)]">
    <AuthRegisterCard />
  </div>
</template>
