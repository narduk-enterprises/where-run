import * as path from 'path'
import * as tsParser from '@typescript-eslint/parser'
/**
 * Tests for no-deprecated-slot rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester'
import rule from '../src/rules/no-deprecated-slot'
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

ruleTester.run('no-deprecated-slot', rule, {
  valid: [
    // Valid slot usage with default slot
    {
      filename: 'test.vue',
      code: '<template><UButton><template #default>Click</template></UButton></template>',
      options: [{ specPath: path.resolve(__dirname, 'mock-spec.json') }],
    },
    // Valid named slot
    {
      filename: 'test.vue',
      code: '<template><UModal><template #header>Title</template></UModal></template>',
      options: [{ specPath: path.resolve(__dirname, 'mock-spec.json') }],
    },
    // Dynamic slots (UTable)
    {
      filename: 'test.vue',
      code: '<template><UTable><template #name-cell>Cell</template></UTable></template>',
      options: [{ specPath: path.resolve(__dirname, 'mock-spec.json') }],
    },
    // Dynamic slots (UTabs)
    {
      filename: 'test.vue',
      code: '<template><UTabs><template #customTab>Tab</template></UTabs></template>',
      options: [{ specPath: path.resolve(__dirname, 'mock-spec.json') }],
    },
    // Fallback slot (UAvatar)
    {
      filename: 'test.vue',
      code: '<template><UAvatar><template #fallback>?</template></UAvatar></template>',
      options: [{ specPath: path.resolve(__dirname, 'mock-spec.json') }],
    },
  ],
  invalid: [
    // Unknown slot (not dynamic pattern)
    {
      filename: 'test.vue',
      code: '<template><UButton><template #unknownSlot>Content</template></UButton></template>',
      options: [{ specPath: path.resolve(__dirname, 'mock-spec.json') }],
      errors: [
        {
          messageId: 'unknownSlot',
        },
      ],
      // No mechanical replacement known for 'unknownSlot'
    },
    {
      filename: 'test.vue',
      code: '<template><UTabs><template #item>Content</template></UTabs></template>',
      options: [{ specPath: path.resolve(__dirname, 'mock-spec.json') }],
      errors: [
        {
          messageId: 'deprecatedSlot',
        },
      ],
      output: '<template><UTabs><template #content>Content</template></UTabs></template>',
    },
  ],
})
