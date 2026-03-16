/**
 * ESLint configs for vue-official-best-practices
 */

export const recommended = {
  plugins: ['vue-official'],
  rules: {
    // Component rules
    'vue-official/require-script-setup': 'warn',
    'vue-official/no-setup-top-level-side-effects': 'error',
    'vue-official/no-async-computed-getter': 'error',
    'vue-official/prefer-shallow-watch': 'warn',
    'vue-official/no-template-complex-expressions': 'warn',
    'vue-official/consistent-defineprops-emits': 'error',
    'vue-official/prefer-typed-defineprops': 'warn',

    // Composable rules
    'vue-official/require-use-prefix-for-composables': 'warn',
    'vue-official/no-composable-conditional-hooks': 'warn',
    'vue-official/no-composable-dom-access-without-client-guard': 'error',

    // Store rules
    'vue-official/pinia-require-defineStore-id': 'error',
    'vue-official/pinia-no-direct-state-mutation-outside-actions': 'warn',
    'vue-official/pinia-prefer-storeToRefs-destructure': 'warn',
  },
}

export const strict = {
  plugins: ['vue-official'],
  rules: {
    // Component rules - all errors
    'vue-official/require-script-setup': 'error',
    'vue-official/no-setup-top-level-side-effects': 'error',
    'vue-official/no-async-computed-getter': 'error',
    'vue-official/prefer-shallow-watch': 'error',
    'vue-official/no-template-complex-expressions': 'error',
    'vue-official/consistent-defineprops-emits': 'error',
    'vue-official/prefer-typed-defineprops': 'error',

    // Composable rules - all errors
    'vue-official/require-use-prefix-for-composables': 'error',
    'vue-official/no-composable-conditional-hooks': 'error',
    'vue-official/no-composable-dom-access-without-client-guard': 'error',

    // Store rules - all errors
    'vue-official/pinia-require-defineStore-id': 'error',
    'vue-official/pinia-no-direct-state-mutation-outside-actions': 'error',
    'vue-official/pinia-prefer-storeToRefs-destructure': 'error',
  },
}
