/**
 * Tests for require-csrf-header-on-mutations rule
 */

import { RuleTester } from 'eslint'
import rule from '../src/rules/require-csrf-header-on-mutations'

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

const composableFile = 'app/composables/useAuthApi.ts'
const pageFile = 'app/pages/index.vue'
const serverFile = 'server/api/foo.ts'

ruleTester.run('require-csrf-header-on-mutations', rule, {
  valid: [
    // ✅ POST with X-Requested-With header inline
    {
      filename: composableFile,
      options: [{ testMode: true }],
      code: `$fetch('/api/login', { method: 'POST', body: payload, headers: { 'X-Requested-With': 'XMLHttpRequest' } })`,
    },
    // ✅ PUT with X-Requested-With header inline
    {
      filename: composableFile,
      options: [{ testMode: true }],
      code: `$fetch('/api/users/1', { method: 'PUT', body: payload, headers: { 'X-Requested-With': 'XMLHttpRequest' } })`,
    },
    // ✅ Headers passed as variable reference (e.g. csrfHeaders)
    {
      filename: composableFile,
      options: [{ testMode: true }],
      code: `$fetch('/api/login', { method: 'POST', body: payload, headers: csrfHeaders })`,
    },
    // ✅ GET request — no CSRF needed
    {
      filename: composableFile,
      options: [{ testMode: true }],
      code: `$fetch('/api/users', { method: 'GET' })`,
    },
    // ✅ $fetch with no method (defaults to GET)
    {
      filename: composableFile,
      options: [{ testMode: true }],
      code: `$fetch('/api/users')`,
    },
    // ✅ Rule does not run in page files (without testMode)
    {
      filename: pageFile,
      code: `$fetch('/api/login', { method: 'POST', body: payload })`,
    },
    // ✅ Rule does not run in server files
    {
      filename: serverFile,
      code: `$fetch('/api/login', { method: 'POST', body: payload })`,
    },
  ],
  invalid: [
    // ❌ POST with no headers at all
    {
      filename: composableFile,
      options: [{ testMode: true }],
      code: `$fetch('/api/login', { method: 'POST', body: payload })`,
      errors: [{ messageId: 'missingCsrf' }],
    },
    // ❌ DELETE with no headers
    {
      filename: composableFile,
      options: [{ testMode: true }],
      code: `$fetch('/api/users/1', { method: 'DELETE' })`,
      errors: [{ messageId: 'missingCsrf' }],
    },
    // ❌ PATCH with headers that don't include X-Requested-With
    {
      filename: composableFile,
      options: [{ testMode: true }],
      code: `$fetch('/api/users/1', { method: 'PATCH', body: data, headers: { 'Content-Type': 'application/json' } })`,
      errors: [{ messageId: 'missingCsrf' }],
    },
    // ❌ PUT with empty headers object
    {
      filename: composableFile,
      options: [{ testMode: true }],
      code: `$fetch('/api/users/1', { method: 'PUT', body: data, headers: {} })`,
      errors: [{ messageId: 'missingCsrf' }],
    },
  ],
})
