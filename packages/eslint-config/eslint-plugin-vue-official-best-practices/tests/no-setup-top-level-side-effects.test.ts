import * as tsParser from '@typescript-eslint/parser'
/**
 * Tests for no-setup-top-level-side-effects rule
 */

import { RuleTester } from 'eslint'
import rule from '../src/rules/no-setup-top-level-side-effects'
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

ruleTester.run('no-setup-top-level-side-effects', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: `
        <script setup>
        const { data } = await useFetch('/api')
        </script>
      `,
    },
    {
      filename: 'test.vue',
      code: `
        <script setup>
        onMounted(() => {
          window.addEventListener('resize', handleResize)
        })
        </script>
      `,
    },
    {
      filename: 'test.vue',
      code: `
        <script setup>
        if (import.meta.client) {
          window.something = true
        }
        </script>
      `,
    },
  ],
  invalid: [
    {
      filename: 'test.vue',
      code: `
        <script setup>
        fetch('/api')
        </script>
      `,
      errors: [
        {
          messageId: 'noTopLevelSideEffect',
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
        <script setup>
        setInterval(() => {}, 1000)
        </script>
      `,
      errors: [
        {
          messageId: 'noTopLevelSideEffect',
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `
        <script setup>
        window.something = true
        </script>
      `,
      errors: [
        {
          messageId: 'noTopLevelSideEffect',
        },
      ],
    },
  ],
})
