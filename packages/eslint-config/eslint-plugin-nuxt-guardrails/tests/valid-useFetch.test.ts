/**
 * Tests for valid-useFetch rule
 */

import { RuleTester } from 'eslint'
import rule from '../src/rules/valid-useFetch'

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

ruleTester.run('valid-useFetch', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: "useFetch('/api/data')",
    },
    {
      filename: 'test.vue',
      code: 'useFetch(() => `/api/${id}`)',
    },
    {
      filename: 'test.vue',
      code: "useFetch('/api/data', { server: true })",
    },
  ],
  invalid: [
    {
      filename: 'test.vue',
      code: 'useFetch()',
      errors: [
        {
          messageId: 'missingUrl',
        },
      ],
    },
  ],
})
