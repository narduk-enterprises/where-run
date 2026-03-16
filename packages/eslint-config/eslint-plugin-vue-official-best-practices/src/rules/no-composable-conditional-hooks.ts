/**
 * Rule: vue-official/no-composable-conditional-hooks
 *
 * Warns against conditionally calling Vue composables in composables
 */

import type { RuleContext, RuleListener } from 'eslint'
import { VUE_COMPOSITION_API } from '../utils/vue-docs-urls'

const VUE_COMPOSABLES = [
  'ref',
  'reactive',
  'computed',
  'watch',
  'watchEffect',
  'watchPostEffect',
  'watchSyncEffect',
  'readonly',
  'shallowRef',
  'shallowReactive',
  'shallowReadonly',
  'toRef',
  'toRefs',
  'toValue',
  'unref',
  'isRef',
  'isReactive',
  'isReadonly',
  'isProxy',
]

export default {
  meta: {
    type: 'problem' as const,
    docs: {
      description: 'disallow conditional calls to Vue composables in composables',
      category: 'Best Practices',
      recommended: true,
      url: VUE_COMPOSITION_API,
    },
    schema: [],
    messages: {
      conditionalHook:
        'Vue composables (ref, computed, watchEffect, etc.) should be called unconditionally in composables. See: {{url}}',
    },
  },
  create(context: RuleContext<string, any[]>): RuleListener {
    const filename = context.filename ?? context.getFilename?.()

    // Only apply to composable files (heuristic)
    const isComposableFile = filename.includes('composables/') || filename.includes('composable')

    if (!isComposableFile) {
      return {}
    }

    const checkConditionalHook = (node: any, parent: any) => {
      // Check if this is a Vue composable call
      if (
        node.type === 'CallExpression' &&
        node.callee &&
        node.callee.type === 'Identifier' &&
        VUE_COMPOSABLES.includes(node.callee.name)
      ) {
        // Check if it's inside a conditional
        let current: any = parent
        while (current) {
          // If inside a conditional or loop, warn
          if (
            current.type === 'IfStatement' ||
            current.type === 'ForStatement' ||
            current.type === 'WhileStatement' ||
            current.type === 'SwitchStatement' ||
            current.type === 'ConditionalExpression' ||
            current.type === 'LogicalExpression'
          ) {
            context.report({
              node,
              messageId: 'conditionalHook',
              data: { url: VUE_COMPOSITION_API },
            })
            return
          }

          // Stop when we reach the function boundary where the composable resides
          if (
            current.type === 'FunctionDeclaration' ||
            current.type === 'FunctionExpression' ||
            current.type === 'ArrowFunctionExpression'
          ) {
            break
          }

          current = current.parent
        }
      }
    }

    return {
      CallExpression(node: any) {
        checkConditionalHook(node, node.parent)
      },
    }
  },
}
