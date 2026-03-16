/** @type {import('vitest').UserConfig} */
export default {
  test: {
    globals: true,
    environment: 'node',
    include: [
      'eslint-plugin-nuxt-guardrails/tests/**/*.test.ts',
      'eslint-plugin-nuxt-ui/tests/**/*.test.ts',
      'eslint-plugin-vue-official-best-practices/tests/**/*.test.ts',
      'eslint-plugins/tests/**/*.test.mjs',
    ],
  },
}
