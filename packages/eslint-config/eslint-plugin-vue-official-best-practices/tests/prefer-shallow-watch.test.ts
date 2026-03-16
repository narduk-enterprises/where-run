import * as tsParser from '@typescript-eslint/parser'
/**
 * Tests for prefer-shallow-watch rule
 */

import { RuleTester } from 'eslint'
import rule from '../src/rules/prefer-shallow-watch'
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

ruleTester.run('prefer-shallow-watch', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: `
        <script setup>
        watch(state, () => {})
        </script>
      `,
    },
    {
      filename: 'test.vue',
      code: `
        <script setup>
        /* vue-official allow-deep-watch */
        watch(state, () => {}, { deep: true })
        </script>
      `,
    },
  ],
  invalid: [
    {
      filename: 'test.vue',
      code: `
        <script setup>
        watch(state, () => {}, { deep: true })
        </script>
      `,
      errors: [
        {
          messageId: 'preferShallowWatch',
        },
      ],
    },
  ],
})
