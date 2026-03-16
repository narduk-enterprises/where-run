import * as tsParser from '@typescript-eslint/parser'
/**
 * Tests for require-script-setup rule
 */

import { RuleTester } from 'eslint'
import rule from '../src/rules/require-script-setup'
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

ruleTester.run('require-script-setup', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: `
        <script setup>
        const count = ref(0)
        </script>
      `,
    },
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
        <script>
        export default {
          name: 'MyComponent',
        }
        </script>
      `,
      options: [{ allowOptionsApi: true }],
    },
  ],
  invalid: [
    {
      filename: 'test.vue',
      code: `
        <script>
        export default {
          data() {
            return { count: 0 }
          },
          methods: {
            increment() {
              this.count++
            }
          }
        }
        </script>
      `,
      options: [{ allowOptionsApi: false }],
      errors: [
        {
          messageId: 'preferScriptSetup',
        },
      ],
    },
  ],
})
