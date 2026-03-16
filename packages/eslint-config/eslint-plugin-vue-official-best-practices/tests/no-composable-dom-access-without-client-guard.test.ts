/**
 * Tests for no-composable-dom-access-without-client-guard rule
 */

import { RuleTester } from 'eslint'
import rule from '../src/rules/no-composable-dom-access-without-client-guard'

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

ruleTester.run('no-composable-dom-access-without-client-guard', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: `
        export function useWindow() {
          if (import.meta.client) {
            window.something = true
          }
        }
      `,
      filename: 'composables/useWindow.ts',
    },
    {
      filename: 'test.vue',
      code: `
        export function useWindow() {
          onMounted(() => {
            window.something = true
          })
        }
      `,
      filename: 'composables/useWindow.ts',
    },
  ],
  invalid: [
    {
      filename: 'test.vue',
      code: `
        export function useWindow() {
          window.something = true
        }
      `,
      filename: 'composables/useWindow.ts',
      errors: [
        {
          messageId: 'noClientGuard',
        },
      ],
    },
  ],
})
