/**
 * Tests for pinia-no-direct-state-mutation-outside-actions rule
 */

import { RuleTester } from 'eslint'
import rule from '../src/rules/pinia-no-direct-state-mutation-outside-actions'

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

ruleTester.run('pinia-no-direct-state-mutation-outside-actions', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: `
        import { defineStore } from 'pinia'
        export const useStore = defineStore('store', () => {
          const count = ref(0)
          function increment() {
            count.value++
          }
          return { count, increment }
        })
      `,
    },
  ],
  invalid: [
    {
      filename: 'test.vue',
      code: `
        const store = useCounterStore()
        store.$state.count = 1
      `,
      errors: [
        {
          messageId: 'noDirectMutation',
        },
      ],
    },
  ],
})
