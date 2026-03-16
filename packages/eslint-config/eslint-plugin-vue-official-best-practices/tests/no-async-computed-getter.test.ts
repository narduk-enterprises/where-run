import * as tsParser from '@typescript-eslint/parser'
/**
 * Tests for no-async-computed-getter rule
 */

import { RuleTester } from 'eslint'
import rule from '../src/rules/no-async-computed-getter'
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

ruleTester.run('no-async-computed-getter', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: `
        <script setup>
        const count = computed(() => 1 + 1)
        </script>
      `,
    },
    {
      filename: 'test.vue',
      code: `
        <script setup>
        const doubled = computed(() => {
          return count.value * 2
        })
        </script>
      `,
    },
  ],
  invalid: [
    {
      filename: 'test.vue',
      code: `
        <script setup>
        const data = computed(async () => {
          const res = await fetch('/api')
          return res.json()
        })
        </script>
      `,
      errors: [
        {
          messageId: 'noAsyncComputed',
        },
      ],
    },
  ],
})
