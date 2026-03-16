import * as tsParser from '@typescript-eslint/parser'
/**
 * Tests for no-legacy-fetch-hook rule
 */

import { RuleTester } from 'eslint'
import rule from '../src/rules/no-legacy-fetch-hook'
import vueParser from 'vue-eslint-parser'

import { describe, it, afterAll } from 'vitest'
RuleTester.describe = describe
RuleTester.it = it
RuleTester.afterAll = afterAll

const ruleTester = new RuleTester({
  languageOptions: {
    parser: vueParser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsParser,
    },
  },
})

ruleTester.run('no-legacy-fetch-hook', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: `
        <script setup>
        const { data } = await useFetch('/api')
        </script>
      `,
    },
  ],
  invalid: [
    {
      filename: 'test.vue',
      code: `
        <script>
        export default {
          async fetch() {
            return { data: {} }
          }
        }
        </script>
      `,
      errors: [
        {
          messageId: 'legacyFetch',
        },
      ],
    },
  ],
})
