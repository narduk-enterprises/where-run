import * as tsParser from '@typescript-eslint/parser'
/**
 * Tests for no-legacy-head rule
 */

import { RuleTester } from 'eslint'
import rule from '../src/rules/no-legacy-head'
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

ruleTester.run('no-legacy-head', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: `
        <script setup>
        useHead({ title: 'Test' })
        </script>
      `,
    },
    {
      filename: 'test.vue',
      code: `
        <script>
        export default {
          data() {
            return {}
          }
        }
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
          head() {
            return { title: 'Test' }
          }
        }
        </script>
      `,
      errors: [
        {
          messageId: 'legacyHeadMethod',
        },
      ],
      // No output expected since it's a method which requires manual fix
    },
    {
      filename: 'test.vue',
      code: `
        <script>
        export default {
          head: {
            title: 'Test'
          }
        }
        </script>
      `,
      errors: [
        {
          messageId: 'legacyHeadOption',
        },
      ],
    },
  ],
})
