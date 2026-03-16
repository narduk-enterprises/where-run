/**
 * eslint-plugin-atx
 *
 * Custom ESLint rules enforcing the ATX design system conventions.
 * Violations are caught at edit-time in your IDE.
 *
 * Usage in eslint.config.mjs:
 *
 *   import atx from './eslint-plugins/index.mjs'
 *   export default withNuxt(...atx.configs.recommended)
 */

import noRawTailwindColors from './rules/no-raw-tailwind-colors.mjs'
import noTailwindV3Deprecated from './rules/no-tailwind-v3-deprecated.mjs'
import noInvalidNuxtUiToken from './rules/no-invalid-nuxt-ui-token.mjs'
import noNativeButton from './rules/no-native-button.mjs'
import noInlineSvg from './rules/no-inline-svg.mjs'
import lucideIconsOnly from './rules/lucide-icons-only.mjs'
import noStyleBlockLayout from './rules/no-style-block-layout.mjs'
import requireClientOnlySwitch from './rules/require-client-only-switch.mjs'
import noAttrsOnFragment from './rules/no-attrs-on-fragment.mjs'
import noNativeInput from './rules/no-native-input.mjs'
import noNativeForm from './rules/no-native-form.mjs'
import noNativeTable from './rules/no-native-table.mjs'
import preferULink from './rules/prefer-ulink.mjs'
import noNativeLayout from './rules/no-native-layout.mjs'
import noSelectEmptyValue from './rules/no-select-empty-value.mjs'
import noNativeDetails from './rules/no-native-details.mjs'
import noNativeHr from './rules/no-native-hr.mjs'
import noNativeProgress from './rules/no-native-progress.mjs'
import noNativeDialog from './rules/no-native-dialog.mjs'
import noNativeKbd from './rules/no-native-kbd.mjs'
import noInlineHex from './rules/no-inline-hex.mjs'
import requireValidatedBody from './rules/require-validated-body.mjs'
import requireValidatedQuery from './rules/require-validated-query.mjs'
import preferDrizzleOperators from './rules/prefer-drizzle-operators.mjs'
import noFetchInComponent from './rules/no-fetch-in-component.mjs'
import noMultiStatementInlineHandler from './rules/no-multi-statement-inline-handler.mjs'
import requireClientOnlyHydrationSensitive from './rules/require-client-only-hydration-sensitive.mjs'
import noApplyInScopedStyle from './rules/no-apply-in-scoped-style.mjs'
import noModuleScopeRef from './rules/no-module-scope-ref.mjs'
import noInlineTypesInStores from './rules/no-inline-types-in-stores.mjs'

const plugin = {
  meta: {
    name: 'eslint-plugin-atx',
    version: '2.0.0',
  },

  rules: {
    'no-raw-tailwind-colors': noRawTailwindColors,
    'no-tailwind-v3-deprecated': noTailwindV3Deprecated,
    'no-invalid-nuxt-ui-token': noInvalidNuxtUiToken,
    'no-native-button': noNativeButton,
    'no-inline-svg': noInlineSvg,
    'lucide-icons-only': lucideIconsOnly,
    'no-style-block-layout': noStyleBlockLayout,
    'require-client-only-switch': requireClientOnlySwitch,
    'no-attrs-on-fragment': noAttrsOnFragment,
    'no-native-input': noNativeInput,
    'no-native-form': noNativeForm,
    'no-native-table': noNativeTable,
    'prefer-ulink': preferULink,
    'no-native-layout': noNativeLayout,
    'no-select-empty-value': noSelectEmptyValue,
    'no-native-details': noNativeDetails,
    'no-native-hr': noNativeHr,
    'no-native-progress': noNativeProgress,
    'no-native-dialog': noNativeDialog,
    'no-native-kbd': noNativeKbd,
    'no-inline-hex': noInlineHex,
    'require-validated-body': requireValidatedBody,
    'require-validated-query': requireValidatedQuery,
    'prefer-drizzle-operators': preferDrizzleOperators,
    'no-fetch-in-component': noFetchInComponent,
    'no-multi-statement-inline-handler': noMultiStatementInlineHandler,
    'require-client-only-hydration-sensitive': requireClientOnlyHydrationSensitive,
    'no-apply-in-scoped-style': noApplyInScopedStyle,
    'no-module-scope-ref': noModuleScopeRef,
    'no-inline-types-in-stores': noInlineTypesInStores,
  },
  configs: {
    recommended: [
      {
        name: 'atx/recommended',
        plugins: {
          get atx() {
            return plugin
          },
        },
        files: ['**/*.vue'],
        rules: {
          'atx/no-raw-tailwind-colors': 'error',
          'atx/no-tailwind-v3-deprecated': 'error',
          'atx/no-invalid-nuxt-ui-token': 'error',
          'atx/no-native-button': 'error',
          'atx/no-inline-svg': 'error',
          'atx/lucide-icons-only': 'error',
          'atx/no-style-block-layout': ['error', { max: 50 }],
          'atx/require-client-only-switch': 'error',
          'atx/no-attrs-on-fragment': 'error',
          'atx/no-native-input': 'error',
          'atx/no-native-form': 'error',
          'atx/no-native-table': 'error',
          'atx/prefer-ulink': 'error',
          'atx/no-native-layout': 'error',
          'atx/no-select-empty-value': 'error',
          'atx/no-native-details': 'error',
          'atx/no-native-hr': 'error',
          'atx/no-native-progress': 'error',
          'atx/no-native-dialog': 'error',
          'atx/no-native-kbd': 'error',
          'atx/no-inline-hex': 'error',
          'atx/no-fetch-in-component': 'error',
          'atx/no-multi-statement-inline-handler': 'error',
          'atx/require-client-only-hydration-sensitive': 'warn',
          'atx/no-apply-in-scoped-style': 'error',
        },
      },
    ],
    app: [
      {
        name: 'atx/app',
        plugins: {
          get atx() {
            return plugin
          },
        },
        files: ['app/composables/**/*.ts', 'app/utils/**/*.ts', 'app/stores/**/*.ts'],
        rules: {
          'atx/no-module-scope-ref': 'warn',
          'atx/no-inline-types-in-stores': 'warn',
        },
      },
    ],
    server: [
      {
        name: 'atx/server',
        plugins: {
          get atx() {
            return plugin
          },
        },
        files: ['server/**/*.ts'],
        rules: {
          'atx/require-validated-body': 'error',
          'atx/require-validated-query': 'error',
          'atx/prefer-drizzle-operators': 'error',
        },
      },
    ],
  },
}

export default plugin
