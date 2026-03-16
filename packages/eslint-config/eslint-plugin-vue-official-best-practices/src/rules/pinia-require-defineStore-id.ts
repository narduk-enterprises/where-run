/**
 * Rule: vue-official/pinia-require-defineStore-id
 *
 * Requires defineStore to have a string literal id
 */

import type { RuleContext, RuleListener } from 'eslint'
import { PINIA_DOCS } from '../utils/vue-docs-urls'
import { isLiteral } from '../utils/ast-utils'

export default {
  meta: {
    type: 'problem' as const,
    docs: {
      description: 'require defineStore to have a string literal id',
      category: 'Best Practices',
      recommended: true,
      url: PINIA_DOCS,
    },
    schema: [],
    messages: {
      requireStoreId: 'defineStore() requires a string literal id as first argument. See: {{url}}',
    },
  },
  create(context: RuleContext<string, any[]>): RuleListener {
    return {
      CallExpression(node: any) {
        if (
          node.callee &&
          node.callee.type === 'Identifier' &&
          node.callee.name === 'defineStore'
        ) {
          // Check if first argument exists and is a string literal
          if (node.arguments.length === 0) {
            context.report({
              node,
              messageId: 'requireStoreId',
              data: { url: PINIA_DOCS },
            })
            return
          }

          const firstArg = node.arguments[0]

          // Must be a string literal
          if (
            !isLiteral(firstArg) ||
            firstArg.type !== 'Literal' ||
            typeof firstArg.value !== 'string'
          ) {
            context.report({
              node: firstArg || node,
              messageId: 'requireStoreId',
              data: { url: PINIA_DOCS },
            })
          }
        }
      },
    }
  },
}
