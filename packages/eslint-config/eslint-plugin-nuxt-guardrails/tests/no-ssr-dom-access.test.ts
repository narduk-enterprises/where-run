/**
 * Tests for no-ssr-dom-access rule
 */

import { RuleTester } from 'eslint'
import rule from '../src/rules/no-ssr-dom-access'

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

ruleTester.run('no-ssr-dom-access', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: 'if (import.meta.client) { window.location.href = "/" }',
    },
    {
      filename: 'test.vue',
      code: 'onMounted(() => { document.title = "Test" })',
    },
    {
      filename: 'test.vue',
      code: 'if (import.meta.client) { localStorage.setItem("key", "value") }',
    },
  ],
  invalid: [
    {
      filename: 'test.vue',
      code: 'window.location.href = "/"',
      errors: [
        {
          messageId: 'unguardedDomAccess',
          data: { type: 'window' },
        },
      ],
    },
    {
      filename: 'test.vue',
      code: 'document.title = "Test"',
      errors: [
        {
          messageId: 'unguardedDomAccess',
          data: { type: 'document' },
        },
      ],
    },
    {
      filename: 'test.vue',
      code: 'localStorage.setItem("key", "value")',
      errors: [
        {
          messageId: 'unguardedDomAccess',
          data: { type: 'localStorage' },
        },
      ],
    },
  ],
})
