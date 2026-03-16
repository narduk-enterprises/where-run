/**
 * Rule: vue-official/no-async-computed-getter
 *
 * Prevents async computed properties (anti-pattern)
 */

import type { RuleContext, RuleListener } from 'eslint'
import { VUE_COMPOSITION_API } from '../utils/vue-docs-urls'

export default {
  meta: {
    type: 'problem' as const,
    docs: {
      description: 'disallow async computed getters',
      category: 'Best Practices',
      recommended: true,
      url: VUE_COMPOSITION_API,
    },
    schema: [],
    messages: {
      noAsyncComputed:
        'Computed properties should not be async. Use watchEffect/watch + ref, or useFetch/useAsyncData for data fetching. See: {{url}}',
    },
  },
  create(context: RuleContext<string, any[]>): RuleListener {
    const parserServices = (context.sourceCode?.parserServices ?? context.parserServices) as any

    if (!parserServices || !parserServices.defineTemplateBodyVisitor) {
      return {}
    }

    return parserServices.defineTemplateBodyVisitor(
      {},
      {
        CallExpression(node: any) {
          // Check for computed(async () => ...)
          if (
            node.callee &&
            node.callee.type === 'Identifier' &&
            node.callee.name === 'computed' &&
            node.arguments.length > 0
          ) {
            const firstArg = node.arguments[0]

            // Check if first argument is async function
            if (firstArg.type === 'ArrowFunctionExpression' && firstArg.async === true) {
              context.report({
                node,
                messageId: 'noAsyncComputed',
                data: { url: VUE_COMPOSITION_API },
              })
              return
            }

            // Check if first argument is async function expression
            if (
              (firstArg.type === 'FunctionExpression' || firstArg.type === 'FunctionDeclaration') &&
              firstArg.async === true
            ) {
              context.report({
                node,
                messageId: 'noAsyncComputed',
                data: { url: VUE_COMPOSITION_API },
              })
            }
          }
        },
      },
    )
  },
}
