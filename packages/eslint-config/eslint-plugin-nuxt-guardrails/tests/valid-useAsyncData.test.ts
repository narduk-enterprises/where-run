/**
 * Tests for valid-useAsyncData rule
 */

import { RuleTester } from 'eslint'
import rule from '../src/rules/valid-useAsyncData'

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

ruleTester.run('valid-useAsyncData', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: "useAsyncData('key', () => fetch('/api'))",
    },
    {
      filename: 'test.vue',
      code: "useAsyncData('key', async () => { return await fetch('/api') })",
    },
    {
      filename: 'test.vue',
      code: 'useAsyncData(key, () => fetch("/api"))',
      options: [{ requireStableAsyncDataKeys: false }],
    },
  ],
  invalid: [
    {
      filename: 'test.vue',
      code: 'useAsyncData()',
      errors: [
        {
          messageId: 'missingKey',
        },
      ],
    },
    {
      filename: 'test.vue',
      code: "useAsyncData('key')",
      errors: [
        {
          messageId: 'missingCallback',
        },
      ],
    },
    {
      filename: 'test.vue',
      code: 'useAsyncData(key, () => fetch("/api"))',
      errors: [
        {
          messageId: 'keyNotLiteral',
        },
      ],
    },
  ],
})
