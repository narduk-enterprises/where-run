import * as path from 'path'
import * as tsParser from '@typescript-eslint/parser'
/**
 * Tests for no-deprecated-event rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester'
import rule from '../src/rules/no-deprecated-event'
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

ruleTester.run('no-deprecated-event', rule, {
  valid: [
    // Standard DOM event
    {
      filename: 'test.vue',
      code: '<template><UButton @click="handleClick">Click</UButton></template>',
      options: [{ specPath: path.resolve(__dirname, 'mock-spec.json') }],
    },
    // v-model update event
    {
      filename: 'test.vue',
      code: '<template><UModal @update:open="handleOpen">Content</UModal></template>',
      options: [{ specPath: path.resolve(__dirname, 'mock-spec.json') }],
    },
    // Standard DOM events (focus, blur, etc.)
    {
      filename: 'test.vue',
      code: '<template><UInput @focus="onFocus" @blur="onBlur" @input="onInput">Content</UInput></template>',
      options: [{ specPath: path.resolve(__dirname, 'mock-spec.json') }],
    },
    // Kebab-case component with standard events
    {
      filename: 'test.vue',
      code: '<template><u-button @click="handleClick">Click</u-button></template>',
      options: [{ specPath: path.resolve(__dirname, 'mock-spec.json') }],
    },
  ],
  invalid: [
    // Unknown event (not in spec or standard DOM events)
    {
      filename: 'test.vue',
      code: '<template><UButton @unknownEvent="handler">Click</UButton></template>',
      options: [{ specPath: path.resolve(__dirname, 'mock-spec.json') }],
      errors: [
        {
          messageId: 'unknownEvent',
        },
      ],
    },
    {
      filename: 'test.vue',
      code: '<template><USelectMenu @change="onUpdate"></USelectMenu></template>',
      options: [{ specPath: path.resolve(__dirname, 'mock-spec.json') }],
      errors: [
        {
          messageId: 'deprecatedEvent',
        },
      ],
      output: '<template><USelectMenu @update:model-value="onUpdate"></USelectMenu></template>',
    },
  ],
})
