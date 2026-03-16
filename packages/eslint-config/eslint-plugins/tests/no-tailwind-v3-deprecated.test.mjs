/**
 * Tests for atx/no-tailwind-v3-deprecated
 */

import { RuleTester } from 'eslint'
import vueParser from 'vue-eslint-parser'
import rule from '../rules/no-tailwind-v3-deprecated.mjs'
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
    },
  },
})

ruleTester.run('no-tailwind-v3-deprecated', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: '<template><div class="shrink-0 grow bg-linear-to-r from-primary to-neutral" /></template>',
    },
    {
      filename: 'test.vue',
      code: '<template><div class="flex items-center" /></template>',
    },
    {
      filename: 'test.vue',
      code: "<template><div :class=\"['shrink', 'bg-linear-to-tr']\" /></template>",
    },
  ],
  invalid: [
    {
      filename: 'test.vue',
      code: '<template><div class="flex-shrink-0" /></template>',
      errors: [
        {
          messageId: 'deprecated',
          data: { bad: 'flex-shrink-0', replacement: 'shrink-0' },
        },
      ],
      output: '<template><div class="shrink-0" /></template>',
    },
    {
      filename: 'test.vue',
      code: '<template><div class="flex-grow" /></template>',
      errors: [
        {
          messageId: 'deprecated',
          data: { bad: 'flex-grow', replacement: 'grow' },
        },
      ],
      output: '<template><div class="grow" /></template>',
    },
    {
      filename: 'test.vue',
      code: '<template><div class="bg-gradient-to-tr from-primary to-neutral" /></template>',
      errors: [
        {
          messageId: 'deprecated',
          data: { bad: 'bg-gradient-to-tr', replacement: 'bg-linear-to-tr' },
        },
      ],
      output: '<template><div class="bg-linear-to-tr from-primary to-neutral" /></template>',
    },
    {
      filename: 'test.vue',
      code: '<template><div class="flex-shrink bg-gradient-to-r" /></template>',
      errors: [
        {
          messageId: 'deprecated',
          data: { bad: 'flex-shrink', replacement: 'shrink' },
        },
      ],
      output: '<template><div class="shrink bg-linear-to-r" /></template>',
    },
  ],
})
