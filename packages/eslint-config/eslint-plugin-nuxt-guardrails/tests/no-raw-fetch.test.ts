/**
 * Tests for no-raw-fetch rule
 */

import { RuleTester } from 'eslint'
import rule from '../src/rules/no-raw-fetch'

import { describe, it, afterAll } from 'vitest'
RuleTester.describe = describe
RuleTester.it = it
RuleTester.afterAll = afterAll

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
})

const appPage = 'app/pages/index.vue'
const appComponent = 'app/components/Foo.vue'
const appComposable = 'app/composables/useFoo.ts'
const serverFile = 'server/api/foo.ts'
const e2eFile = 'tests/e2e/spec.ts'

ruleTester.run('no-raw-fetch', rule, {
  valid: [
    {
      filename: appPage,
      code: "useAsyncData('key', () => $fetch('/api'))",
    },
    {
      filename: appPage,
      code: "useFetch('/api/foo')",
    },
    {
      filename: appComponent,
      code: "const { data } = useAsyncData('k', () => fetch('/api'))",
    },
    {
      filename: appComposable,
      code: "useFetch('/api/bar')",
    },
    // Rule does not run in app/composables/ (composables may use $fetch; caller uses useAsyncData)
    {
      filename: appComposable,
      code: 'export function useBar() { return $fetch("/api") }',
    },
    // Rule does not run outside app/pages and app/components
    {
      filename: serverFile,
      code: 'const res = await $fetch("/api")',
    },
    // Rule skips e2e and test files
    {
      filename: e2eFile,
      code: 'await $fetch(baseURL)',
    },
  ],
  invalid: [
    {
      filename: appPage,
      code: 'const data = await $fetch("/api")',
      options: [{ testMode: true }],
      errors: [{ messageId: 'rawFetch' }],
    },
    {
      filename: appPage,
      code: 'const data = $fetch("/api")',
      options: [{ testMode: true }],
      errors: [{ messageId: 'rawFetch' }],
    },
    {
      filename: appComponent,
      code: 'onMounted(() => { $fetch("/api") })',
      options: [{ testMode: true }],
      errors: [{ messageId: 'rawFetch' }],
    },
    {
      filename: appPage,
      code: 'export function useBar() { return $fetch("/api") }',
      options: [{ testMode: true }],
      errors: [{ messageId: 'rawFetch' }],
    },
  ],
})
