import * as tsParser from '@typescript-eslint/parser'
/**
 * Tests for consistent-defineprops-emits rule
 */

import { RuleTester } from 'eslint'
import rule from '../src/rules/consistent-defineprops-emits'
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

ruleTester.run('consistent-defineprops-emits', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: `
        <script setup>
        const props = defineProps<{ name: string }>()
        const emit = defineEmits<{ change: [value: string] }>()
        </script>
      `,
    },
  ],
  invalid: [
    {
      filename: 'test.vue',
      code: `
        <script setup>
        const props1 = defineProps<{ name: string }>()
        const props2 = defineProps<{ age: number }>()
        </script>
      `,
      errors: [
        {
          messageId: 'multipleDefineProps',
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
        <script setup>
        if (true) {
          const props = defineProps<{ name: string }>()
        }
        </script>
      `,
      errors: [
        {
          messageId: 'notTopLevel',
        },
      ],
    },
  ],
})
