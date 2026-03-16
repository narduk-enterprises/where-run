/**
 * Tests for no-composable-conditional-hooks rule
 */

import { RuleTester } from 'eslint'
import rule from '../src/rules/no-composable-conditional-hooks'

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

ruleTester.run('no-composable-conditional-hooks', rule, {
  valid: [
    {
      code: `
        export function useCounter() {
          const count = ref(0)
          return { count }
        }
      `,
      filename: 'composables/useCounter.ts',
    },
  ],
  invalid: [
    {
      code: `
        export function useCounter() {
          if (true) {
            const count = ref(0)
          }
          return {}
        }
      `,
      filename: 'composables/useCounter.ts',
      errors: [
        {
          messageId: 'conditionalHook',
        },
      ],
    },
  ],
})
