/**
 * ESLint plugin for Nuxt 4 guardrails
 */

import noLegacyHead from './rules/no-legacy-head'
import noLegacyFetchHook from './rules/no-legacy-fetch-hook'
import noRawFetch from './rules/no-raw-fetch'
import preferImportMetaClient from './rules/prefer-import-meta-client'
import preferImportMetaDev from './rules/prefer-import-meta-dev'
import noSsrDomAccess from './rules/no-ssr-dom-access'
import validUseAsyncData from './rules/valid-useAsyncData'
import validUseFetch from './rules/valid-useFetch'
import appStructureConsistency from './rules/app-structure-consistency'
import requireUseSeoOnPages from './rules/require-use-seo-on-pages'
import preferUseSeoOverBareMeta from './rules/prefer-use-seo-over-bare-meta'
import requireSchemaOnPages from './rules/require-schema-on-pages'
import noMapAsyncInServer from './rules/no-map-async-in-server'
import noRawFetchInStores from './rules/no-raw-fetch-in-stores'
import pluginSuffixForBrowserApis from './rules/plugin-suffix-for-browser-apis'
import noNonSerializableStoreState from './rules/no-non-serializable-store-state'
import requireCsrfHeaderOnMutations from './rules/require-csrf-header-on-mutations'
import noCsrfExemptRouteMisuse from './rules/no-csrf-exempt-route-misuse'
import noFetchCreateBypass from './rules/no-fetch-create-bypass'

export default {
  meta: {
    name: 'eslint-plugin-nuxt-guardrails',
    version: '1.0.0',
  },
  rules: {
    'no-legacy-head': noLegacyHead,
    'no-legacy-fetch-hook': noLegacyFetchHook,
    'no-raw-fetch': noRawFetch,
    'prefer-import-meta-client': preferImportMetaClient,
    'prefer-import-meta-dev': preferImportMetaDev,
    'no-ssr-dom-access': noSsrDomAccess,
    'valid-useAsyncData': validUseAsyncData,
    'valid-useFetch': validUseFetch,
    'app-structure-consistency': appStructureConsistency,
    'require-use-seo-on-pages': requireUseSeoOnPages,
    'prefer-use-seo-over-bare-meta': preferUseSeoOverBareMeta,
    'require-schema-on-pages': requireSchemaOnPages,
    'no-map-async-in-server': noMapAsyncInServer,
    'no-raw-fetch-in-stores': noRawFetchInStores,
    'plugin-suffix-for-browser-apis': pluginSuffixForBrowserApis,
    'no-non-serializable-store-state': noNonSerializableStoreState,
    'require-csrf-header-on-mutations': requireCsrfHeaderOnMutations,
    'no-csrf-exempt-route-misuse': noCsrfExemptRouteMisuse,
    'no-fetch-create-bypass': noFetchCreateBypass,
  },
  configs: {
    recommended: {
      plugins: ['nuxt-guardrails'],
      rules: {
        'nuxt-guardrails/no-legacy-head': 'warn',
        'nuxt-guardrails/no-legacy-fetch-hook': 'error',
        'nuxt-guardrails/no-raw-fetch': 'error',
        'nuxt-guardrails/prefer-import-meta-client': 'warn',
        'nuxt-guardrails/prefer-import-meta-dev': 'warn',
        'nuxt-guardrails/no-ssr-dom-access': 'error',
        'nuxt-guardrails/valid-useAsyncData': 'warn',
        'nuxt-guardrails/valid-useFetch': 'warn',
        'nuxt-guardrails/app-structure-consistency': 'warn',
        'nuxt-guardrails/require-use-seo-on-pages': 'warn',
        'nuxt-guardrails/prefer-use-seo-over-bare-meta': 'warn',
        'nuxt-guardrails/require-schema-on-pages': 'warn',
        'nuxt-guardrails/no-map-async-in-server': 'warn',
        'nuxt-guardrails/no-raw-fetch-in-stores': 'error',
        'nuxt-guardrails/plugin-suffix-for-browser-apis': 'error',
        'nuxt-guardrails/no-non-serializable-store-state': 'warn',
        'nuxt-guardrails/require-csrf-header-on-mutations': 'error',
        'nuxt-guardrails/no-csrf-exempt-route-misuse': 'warn',
        'nuxt-guardrails/no-fetch-create-bypass': 'error',
      },
    },
  },
}
