/**
 * Tests for pinia-require-defineStore-id rule
 */

import { RuleTester } from 'eslint'
import rule from '../src/rules/pinia-require-defineStore-id'

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

ruleTester.run('pinia-require-defineStore-id', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: `import { defineStore } from 'pinia'
export const useStore = defineStore('store-id', () => {
  return {}
})`,
    },
    {
      filename: 'test.vue',
      code: `import { defineStore } from 'pinia'
export const useStore = defineStore('my-store', {
  state: () => ({}),
})`,
    },
  ],
  invalid: [
    {
      filename: 'test.vue',
      code: `import { defineStore } from 'pinia'
export const useStore = defineStore()`,
      errors: [
        {
          messageId: 'requireStoreId',
        },
      ],
    },
    {
      filename: 'test.vue',
      code: `import { defineStore } from 'pinia'
const id = 'store-id'
export const useStore = defineStore(id, () => {})`,
      errors: [
        {
          messageId: 'requireStoreId',
        },
      ],
    },
  ],
})
