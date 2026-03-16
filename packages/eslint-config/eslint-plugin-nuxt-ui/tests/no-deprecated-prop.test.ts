import * as path from 'path'
import * as tsParser from '@typescript-eslint/parser'
/**
 * Tests for no-deprecated-prop rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester'
import rule from '../src/rules/no-deprecated-prop'
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

ruleTester.run('no-deprecated-prop', rule, {
  valid: [
    // Valid prop usage
    {
      filename: 'test.vue',
      code: '<template><UButton variant="solid">Click</UButton></template>',
      options: [{ specPath: path.resolve(__dirname, 'mock-spec.json') }],
    },
    // Component with non-deprecated props
    {
      filename: 'test.vue',
      code: '<template><UModal v-model:open="isOpen">Content</UModal></template>',
      options: [{ specPath: path.resolve(__dirname, 'mock-spec.json') }],
    },
    // Kebab-case component names
    {
      filename: 'test.vue',
      code: '<template><u-button variant="solid">Click</u-button></template>',
      options: [{ specPath: path.resolve(__dirname, 'mock-spec.json') }],
    },
  ],
  invalid: [
    // Deprecated prop without replacement
    {
      filename: 'test.vue',
      code: '<template><UButton oldProp="value">Click</UButton></template>',
      options: [{ specPath: path.resolve(__dirname, 'mock-spec.json') }],
      errors: [
        {
          messageId: 'deprecatedProp',
        },
      ],
      // No output expected for oldProp since it's not mechanically mapped in spec
    },
    // Deprecated prop WITH replacement
    {
      filename: 'test.vue',
      code: '<template><UButton padded="false">Click</UButton></template>',
      options: [{ specPath: path.resolve(__dirname, 'mock-spec.json') }],
      errors: [
        {
          messageId: 'deprecatedProp',
        },
      ],
      // Should auto-fix 'padded' to its v4 replacement
      output: `<template><UButton :ui="{ root: 'p-0' }">Click</UButton></template>`,
    },
    // Check another specific replacement based on spec
    {
      filename: 'test.vue',
      code: '<template><UAvatar alt="text" /></template>',
      options: [{ specPath: path.resolve(__dirname, 'mock-spec.json') }],
      errors: [
        {
          messageId: 'deprecatedProp',
        },
      ],
      output: '<template><UAvatar text="text" /></template>',
    },
  ],
})
