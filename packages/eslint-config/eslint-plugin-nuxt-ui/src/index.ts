/**
 * ESLint plugin for Nuxt UI v4 component validation
 */

import noUnknownComponentProp from './rules/no-unknown-component-prop'
import noDeprecatedComponent from './rules/no-deprecated-component'
import noDeprecatedProp from './rules/no-deprecated-prop'
import noDeprecatedSlot from './rules/no-deprecated-slot'
import noDeprecatedEvent from './rules/no-deprecated-event'
import requireValidVariantValues from './rules/require-valid-variant-values'
import preferUform from './rules/prefer-uform'
import preferLoadingAuto from './rules/prefer-loading-auto'

export default {
  meta: {
    name: 'eslint-plugin-nuxt-ui',
    version: '1.0.0',
  },
  rules: {
    'no-unknown-component-prop': noUnknownComponentProp,
    'no-deprecated-component': noDeprecatedComponent,
    'no-deprecated-prop': noDeprecatedProp,
    'no-deprecated-slot': noDeprecatedSlot,
    'no-deprecated-event': noDeprecatedEvent,
    'require-valid-variant-values': requireValidVariantValues,
    'prefer-uform': preferUform,
    'prefer-loading-auto': preferLoadingAuto,
  },
  configs: {
    recommended: {
      plugins: ['nuxt-ui'],
      rules: {
        'nuxt-ui/no-unknown-component-prop': 'error',
        'nuxt-ui/no-deprecated-component': 'error',
        'nuxt-ui/no-deprecated-prop': 'error',
        'nuxt-ui/no-deprecated-slot': 'error',
        'nuxt-ui/no-deprecated-event': 'error',
        'nuxt-ui/require-valid-variant-values': 'error',
        'nuxt-ui/prefer-uform': 'warn',
        'nuxt-ui/prefer-loading-auto': 'warn',
      },
    },
  },
}
