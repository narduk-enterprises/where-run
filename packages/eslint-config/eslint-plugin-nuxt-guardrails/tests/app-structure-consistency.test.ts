/**
 * Tests for app-structure-consistency rule
 * Note: This rule checks file system, so tests are limited
 */

import { RuleTester } from 'eslint'
import rule from '../src/rules/app-structure-consistency'

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

ruleTester.run('app-structure-consistency', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: 'export default {}',
      options: [{ projectStyle: 'legacy' }],
    },
    {
      filename: 'test.vue',
      code: 'export default {}',
      options: [{ projectStyle: 'mixed' }],
    },
  ],
  invalid: [
    // Note: Actual file system checks would require mocking
    // These tests verify the rule structure
  ],
})
