/**
 * Tests for prefer-import-meta-client rule
 */

import { RuleTester } from 'eslint'
import rule from '../src/rules/prefer-import-meta-client'

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

ruleTester.run('prefer-import-meta-client', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: 'if (import.meta.client) { console.log("client") }',
    },
    {
      filename: 'test.vue',
      code: 'if (import.meta.server) { console.log("server") }',
    },
    {
      filename: 'test.vue',
      code: 'if (process.client) { }',
      options: [{ allowProcessClientServer: true }],
    },
  ],
  invalid: [
    {
      filename: 'test.vue',
      code: 'if (process.client) { }',
      errors: [
        {
          messageId: 'preferImportMetaClient',
        },
      ],
      output: 'if (import.meta.client) { }',
    },
    {
      filename: 'test.vue',
      code: 'if (process.server) { }',
      errors: [
        {
          messageId: 'preferImportMetaServer',
        },
      ],
      output: 'if (import.meta.server) { }',
    },
  ],
})
