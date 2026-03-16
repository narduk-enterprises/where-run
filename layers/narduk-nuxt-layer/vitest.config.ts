import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Server-only unit tests — no Nuxt/Vue runtime needed
    include: ['tests/**/*.test.ts'],
  },
})
