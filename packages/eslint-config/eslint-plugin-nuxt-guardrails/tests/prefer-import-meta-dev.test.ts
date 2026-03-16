/**
 * Tests for prefer-import-meta-dev rule
 */

import { RuleTester } from 'eslint'
import rule from '../src/rules/prefer-import-meta-dev'

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

const serverFile = 'server/utils/foo.ts'
const appPlugin = 'app/plugins/foo.ts'

ruleTester.run('prefer-import-meta-dev', rule, {
  valid: [
    {
      filename: serverFile,
      code: 'if (import.meta.dev) { console.log("dev") }',
    },
    {
      filename: appPlugin,
      code: 'export default defineNuxtPlugin(() => { if (import.meta.dev) {} })',
    },
    // Rule does not run outside server/ or app/
    {
      filename: 'other/script.ts',
      code: 'const x = process.env.NODE_ENV',
    },
  ],
  invalid: [
    {
      filename: serverFile,
      code: 'if (process.env.NODE_ENV === "development") {}',
      options: [{ testMode: true }],
      errors: [{ messageId: 'useImportMetaDev' }],
    },
    {
      filename: serverFile,
      code: 'const isDev = process.env.NODE_ENV !== "production"',
      options: [{ testMode: true }],
      errors: [{ messageId: 'useImportMetaDev' }],
    },
    {
      filename: appPlugin,
      code: 'if (process.env.NODE_ENV) { initAnalytics() }',
      options: [{ testMode: true }],
      errors: [{ messageId: 'useImportMetaDev' }],
    },
  ],
})
