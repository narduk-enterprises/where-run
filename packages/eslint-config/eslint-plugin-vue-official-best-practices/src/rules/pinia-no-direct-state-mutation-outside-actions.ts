/**
 * Rule: vue-official/pinia-no-direct-state-mutation-outside-actions
 *
 * Warns against direct state mutation outside store actions
 */

import type { RuleContext, RuleListener } from 'eslint'
import { PINIA_DOCS } from '../utils/vue-docs-urls'

export default {
  meta: {
    type: 'suggestion' as const,
    docs: {
      description: 'disallow direct state mutation outside store actions',
      category: 'Best Practices',
      recommended: true,
      url: PINIA_DOCS,
    },
    schema: [
      {
        type: 'object',
        properties: {
          strict: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noDirectMutation:
        'Avoid direct state mutation outside store actions. Use store actions instead. See: {{url}}',
    },
  },
  create(context: RuleContext<string, any[]>): RuleListener {
    const options = context.options[0] || {}
    const strict = options.strict !== false // Default: true

    if (!strict) {
      return {}
    }

    // Track defineStore calls to know what's inside a store
    const storeScopes = new Set<any>()

    return {
      CallExpression(node: any) {
        // Track defineStore calls
        if (
          node.callee &&
          node.callee.type === 'Identifier' &&
          node.callee.name === 'defineStore'
        ) {
          // Mark this scope as a store definition
          let current: any = node
          while (current && current.type !== 'Program') {
            storeScopes.add(current)
            current = current.parent
          }
        }
      },
      AssignmentExpression(node: any) {
        // Check for assignments like store.property = value or store.$state.property = value
        if (node.left && node.left.type === 'MemberExpression') {
          const left = node.left

          // Check if it's store.something = ... or store.$state.something = ...
          if (
            left.object &&
            left.object.type === 'MemberExpression' &&
            left.object.property &&
            left.object.property.name === '$state'
          ) {
            // store.$state.property = value
            // Check if we're outside a store definition
            let current: any = node
            let inStore = false

            while (current && current.type !== 'Program') {
              if (storeScopes.has(current)) {
                inStore = true
                break
              }
              current = current.parent
            }

            if (!inStore) {
              context.report({
                node,
                messageId: 'noDirectMutation',
                data: { url: PINIA_DOCS },
              })
            }
          } else if (
            left.object &&
            left.object.type === 'Identifier' &&
            left.object.name &&
            left.object.name.endsWith('Store') // Heuristic: store variable names
          ) {
            // store.property = value (heuristic)
            // Only warn if it looks like a store variable
            let current: any = node
            let inStore = false

            while (current && current.type !== 'Program') {
              if (storeScopes.has(current)) {
                inStore = true
                break
              }
              current = current.parent
            }

            // Check if we're in an action (function inside store)
            if (!inStore) {
              // Conservative: only warn if it's clearly a store pattern
              const isStorePattern =
                left.object.name.includes('Store') ||
                (left.object.name.startsWith('use') && left.object.name.endsWith('Store'))

              if (isStorePattern) {
                context.report({
                  node,
                  messageId: 'noDirectMutation',
                  data: { url: PINIA_DOCS },
                })
              }
            }
          }
        }
      },
    }
  },
}
