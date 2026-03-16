/**
 * Tests for prefer-typed-defineprops rule
 */

import { RuleTester } from 'eslint'
import rule from '../src/rules/prefer-typed-defineprops'
import vueParser from 'vue-eslint-parser'
import tsParser from '@typescript-eslint/parser'

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

ruleTester.run('prefer-typed-defineprops', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: `
        <script setup lang="ts">
        const props = defineProps<{ name: string }>()
        </script>
      `,
    },
    {
      filename: 'test.vue',
      code: `
        <script setup lang="ts">
        const props = withDefaults(defineProps<{ name: string }>(), { name: 'default' })
        </script>
      `,
    },
  ],
  invalid: [
    {
      filename: 'test.vue',
      code: `
        <script setup lang="ts">
        const props = defineProps({ name: String })
        </script>
      `,
      errors: [
        {
          messageId: 'preferTypedProps',
        },
      ],
    },
  ],
})
