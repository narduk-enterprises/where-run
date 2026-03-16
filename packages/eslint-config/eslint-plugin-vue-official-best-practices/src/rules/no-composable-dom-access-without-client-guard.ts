/**
 * Rule: vue-official/no-composable-dom-access-without-client-guard
 *
 * Requires client guards for DOM access in composables
 */

import type { RuleContext, RuleListener } from 'eslint'
import { VUE_SSR_GUIDE } from '../utils/vue-docs-urls'
import { isDomAccess, isInClientContext } from '../utils/ast-utils'

export default {
  meta: {
    type: 'problem' as const,
    docs: {
      description: 'require client guard for DOM access in composables',
      category: 'Best Practices',
      recommended: true,
      url: VUE_SSR_GUIDE,
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowProcessClient: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noClientGuard:
        'DOM access (window/document/localStorage) in composable requires client guard. Use if (import.meta.client) or onMounted(). See: {{url}}',
    },
  },
  create(context: RuleContext<string, any[]>): RuleListener {
    const filename = context.filename ?? context.getFilename?.()
    const options = context.options[0] || {}
    const allowProcessClient = options.allowProcessClient === true

    // Only apply to composable files
    const isComposableFile = filename.includes('composables/') || filename.includes('composable')

    if (!isComposableFile) {
      return {}
    }

    const checkDomAccess = (node: any) => {
      const domAccess = isDomAccess(node)

      if (!domAccess.type) {
        return
      }

      // Check if it's in a client context
      if (isInClientContext(node, context)) {
        return
      }

      // Check for process.client guard (if allowed)
      if (allowProcessClient) {
        let current: any = node.parent
        while (current) {
          if (
            current.type === 'IfStatement' &&
            current.test &&
            current.test.type === 'MemberExpression' &&
            current.test.object &&
            current.test.object.type === 'Identifier' &&
            current.test.object.name === 'process' &&
            current.test.property &&
            current.test.property.name === 'client'
          ) {
            return // Has process.client guard
          }
          current = current.parent
        }
      }

      // Report if no guard found
      context.report({
        node,
        messageId: 'noClientGuard',
        data: { url: VUE_SSR_GUIDE },
      })
    }

    return {
      MemberExpression: checkDomAccess,
      Identifier(node: any) {
        // Check for direct window/document/localStorage identifiers
        if (['window', 'document', 'localStorage'].includes(node.name)) {
          if (
            node.parent &&
            node.parent.type === 'MemberExpression' &&
            node.parent.object === node
          ) {
            return // Will be handled by MemberExpression visitor
          }
          checkDomAccess(node)
        }
      },
    }
  },
}
