/**
 * Tests for atx/no-invalid-nuxt-ui-token
 */

import { RuleTester } from 'eslint'
import vueParser from 'vue-eslint-parser'
import rule from '../rules/no-invalid-nuxt-ui-token.mjs'
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

ruleTester.run('no-invalid-nuxt-ui-token', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: '<template><div class="text-default text-highlighted bg-default border-default" /></template>',
    },
    {
      filename: 'test.vue',
      code: '<template><div class="text-primary bg-muted" /></template>',
    },
    {
      filename: 'test.vue',
      code: '<template><div :class="{ \'text-muted\': true }" /></template>',
    },
  ],
  invalid: [
    {
      filename: 'test.vue',
      code: '<template><h1 class="text-foreground">Title</h1></template>',
      errors: [
        {
          messageId: 'invalidToken',
          data: {
            token: 'text-foreground',
            suggest: 'text-default or text-highlighted',
          },
        },
      ],
    },
    {
      filename: 'test.vue',
      code: '<template><div class="bg-foreground" /></template>',
      errors: [
        {
          messageId: 'invalidToken',
          data: {
            token: 'bg-foreground',
            suggest: 'bg-default or bg-inverted',
          },
        },
      ],
    },
    {
      filename: 'test.vue',
      code: '<template><div class="border-foreground" /></template>',
      errors: [
        {
          messageId: 'invalidToken',
          data: {
            token: 'border-foreground',
            suggest: 'border-default',
          },
        },
      ],
    },
    {
      filename: 'test.vue',
      code: '<template><div :class="\'text-foreground\'" /></template>',
      errors: [
        {
          messageId: 'invalidToken',
          data: {
            token: 'text-foreground',
            suggest: 'text-default or text-highlighted',
          },
        },
      ],
    },
  ],
})
