/**
 * Tests for no-fetch-create-bypass rule
 */

import { RuleTester } from 'eslint'
import rule from '../src/rules/no-fetch-create-bypass'

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

const composableFile = 'app/composables/useApi.ts'
const pluginFile = 'app/plugins/fetch.client.ts'
const componentFile = 'app/components/MyForm.vue'
const serverFile = 'server/api/foo.ts'

ruleTester.run('no-fetch-create-bypass', rule, {
  valid: [
    // ✅ Normal $fetch usage (not .create)
    {
      filename: composableFile,
      options: [{ testMode: true }],
      code: `$fetch('/api/users')`,
    },
    // ✅ $fetch.create in fetch.client.ts (the legitimate use)
    {
      filename: pluginFile,
      code: `const fetchWithCsrf = $fetch.create({ onRequest() {} })`,
    },
    // ✅ $fetch.create in server code (no CSRF needed server-side)
    {
      filename: serverFile,
      code: `const apiFetch = $fetch.create({ baseURL: '/api' })`,
    },
    // ✅ Some other .create() call (not on $fetch)
    {
      filename: composableFile,
      options: [{ testMode: true }],
      code: `const instance = axios.create({ baseURL: '/api' })`,
    },
  ],
  invalid: [
    // ❌ $fetch.create() in a composable
    {
      filename: composableFile,
      options: [{ testMode: true }],
      code: `const apiFetch = $fetch.create({ baseURL: '/api' })`,
      errors: [{ messageId: 'fetchCreateBypass' }],
    },
    // ❌ $fetch.create() in a component
    {
      filename: componentFile,
      options: [{ testMode: true }],
      code: `const myFetch = $fetch.create({ headers: { Authorization: 'Bearer token' } })`,
      errors: [{ messageId: 'fetchCreateBypass' }],
    },
  ],
})
