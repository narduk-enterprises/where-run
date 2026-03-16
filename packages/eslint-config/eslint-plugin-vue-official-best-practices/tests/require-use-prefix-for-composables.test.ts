/**
 * Tests for require-use-prefix-for-composables rule
 */

import { RuleTester } from 'eslint'
import rule from '../src/rules/require-use-prefix-for-composables'

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

ruleTester.run('require-use-prefix-for-composables', rule, {
  valid: [
    {
      code: `export function useCounter() { return {} }`,
      filename: '/composables/useCounter.ts',
    },
    {
      code: `export default function useCounter() { return {} }`,
      filename: '/composables/useCounter.ts',
    },
  ],
  invalid: [
    {
      code: `export function counter() { return {} }`,
      filename: '/composables/counter.ts',
      errors: [
        {
          messageId: 'requireUsePrefix',
        },
      ],
    },
  ],
})
