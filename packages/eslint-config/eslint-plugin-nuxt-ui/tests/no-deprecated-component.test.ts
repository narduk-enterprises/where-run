/**
 * Tests for no-deprecated-component rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester'
import rule from '../src/rules/no-deprecated-component'
import vueParser from 'vue-eslint-parser'
import * as tsParser from '@typescript-eslint/parser'

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

ruleTester.run('no-deprecated-component', rule, {
  valid: [
    {
      filename: 'test.vue',
      code: '<template><USeparator /></template>',
    },
    {
      filename: 'test.vue',
      code: '<template><u-separator /></template>',
    },
    {
      filename: 'test.vue',
      code: '<template><UDropdownMenu><template #default>Menu</template></UDropdownMenu></template>',
    },
    {
      filename: 'test.vue',
      code: '<template><UButton>Click</UButton></template>',
    },
  ],
  invalid: [
    {
      filename: 'test.vue',
      code: '<template><UDivider /></template>',
      errors: [
        { messageId: 'deprecatedComponent', data: { name: 'UDivider', replacement: 'USeparator' } },
      ],
      output: '<template><USeparator /></template>',
    },
    {
      filename: 'test.vue',
      code: '<template><u-divider /></template>',
      errors: [
        { messageId: 'deprecatedComponent', data: { name: 'UDivider', replacement: 'USeparator' } },
      ],
      output: '<template><u-separator /></template>',
    },
    {
      filename: 'test.vue',
      code: '<template><UDropdown>Dropdown</UDropdown></template>',
      errors: [
        {
          messageId: 'deprecatedComponent',
          data: { name: 'UDropdown', replacement: 'UDropdownMenu' },
        },
      ],
      output: '<template><UDropdownMenu>Dropdown</UDropdownMenu></template>',
    },
  ],
})
