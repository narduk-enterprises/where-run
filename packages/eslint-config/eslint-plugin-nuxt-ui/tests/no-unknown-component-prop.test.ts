import * as path from 'path'
import * as tsParser from '@typescript-eslint/parser'
/**
 * Tests for no-unknown-component-prop rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester'
import rule from '../src/rules/no-unknown-component-prop'
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

ruleTester.run('no-unknown-component-prop', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: '<template><UButton variant="solid">Click</UButton></template>',
      options: [{ specPath: path.resolve(__dirname, 'mock-spec.json') }],
    },
    {
      filename: 'test.vue',
      code: '<template><u-button variant="solid">Click</u-button></template>',
      options: [{ specPath: path.resolve(__dirname, 'mock-spec.json') }],
    },
  ],
  invalid: [
    {
      filename: 'test.vue',
      code: '<template><UButton unknownProp="value">Click</UButton></template>',
      options: [{ specPath: path.resolve(__dirname, 'mock-spec.json') }],
      errors: [
        {
          messageId: 'unknownProp',
          data: {
            propName: 'unknownprop',
            componentName: 'UButton',
            componentSlug: 'button',
          },
        },
      ],
    },
  ],
})
