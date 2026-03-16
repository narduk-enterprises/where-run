/**
 * Tests for pinia-prefer-storeToRefs-destructure rule
 */

import { RuleTester } from 'eslint'
import rule from '../src/rules/pinia-prefer-storeToRefs-destructure'

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

ruleTester.run('pinia-prefer-storeToRefs-destructure', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: `
        const store = useCounterStore()
        const { count } = storeToRefs(store)
      `,
    },
    {
      filename: 'test.vue',
      code: `
        const { init } = useNotifications()
      `,
    },
  ],
  invalid: [
    {
      filename: 'test.vue',
      code: `
        const { count } = useCounterStore()
      `,
      errors: [
        {
          messageId: 'preferStoreToRefs',
        },
      ],
      output: `
        const { count } = storeToRefs(useCounterStore())
      `,
    },
  ],
})
