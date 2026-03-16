import * as path from 'path'
import * as tsParser from '@typescript-eslint/parser'
/**
 * Tests for require-valid-variant-values rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester'
import rule from '../src/rules/require-valid-variant-values'
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

ruleTester.run('require-valid-variant-values', rule, {
  valid: [
    // Valid variant value
    {
      filename: 'test.vue',
      code: '<template><UButton variant="solid">Click</UButton></template>',
      options: [{ specPath: path.resolve(__dirname, 'mock-spec.json') }],
    },
    // Valid color value
    {
      filename: 'test.vue',
      code: '<template><UButton color="primary">Click</UButton></template>',
      options: [{ specPath: path.resolve(__dirname, 'mock-spec.json') }],
    },
    // Kebab-case prop names
    {
      filename: 'test.vue',
      code: '<template><UButton variant="outline">Click</UButton></template>',
      options: [{ specPath: path.resolve(__dirname, 'mock-spec.json') }],
    },
    // Dynamic values (should not be checked)
    {
      filename: 'test.vue',
      code: '<template><UButton :variant="dynamicVariant">Click</UButton></template>',
      options: [{ specPath: path.resolve(__dirname, 'mock-spec.json') }],
    },
    // Expression values (should not be checked)
    {
      filename: 'test.vue',
      code: "<template><UButton :variant=\"isActive ? 'solid' : 'outline'\">Click</UButton></template>",
      options: [{ specPath: path.resolve(__dirname, 'mock-spec.json') }],
    },
  ],
  invalid: [
    // Invalid variant value (not in allowed values)
    {
      filename: 'test.vue',
      code: '<template><UButton variant="invalidValue">Click</UButton></template>',
      options: [{ specPath: path.resolve(__dirname, 'mock-spec.json') }],
      errors: [
        {
          messageId: 'invalidVariant',
        },
      ],
    },
    // Invalid color value
    {
      filename: 'test.vue',
      code: '<template><UButton color="invalidColor">Click</UButton></template>',
      options: [{ specPath: path.resolve(__dirname, 'mock-spec.json') }],
      errors: [
        {
          messageId: 'invalidVariant',
        },
      ],
    },
  ],
})
