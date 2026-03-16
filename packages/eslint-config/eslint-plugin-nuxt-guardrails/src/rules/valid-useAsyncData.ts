/**
 * Rule: nuxt-guardrails/valid-useAsyncData
 *
 * Validates useAsyncData usage patterns
 */

import type { Rule } from 'eslint'
import { isLiteral } from '../utils/ast-utils'
import type { PluginOptions } from '../types'
import { getApiSpec } from '../utils/spec-loader'

/**
 * Check if a node is a valid useAsyncData key
 * Valid patterns:
 * - String literal: 'my-key'
 * - Template literal: `game-${id}`
 * - Getter function: () => `game-${id.value}`
 * - Computed ref identifier (e.g., computed(() => `key-${id.value}`))
 */
function isValidAsyncDataKey(node: any): boolean {
  // String or template literal
  if (isLiteral(node)) {
    return true
  }

  // Arrow function that returns a string (getter function)
  if (node.type === 'ArrowFunctionExpression') {
    const body = node.body
    // Arrow with expression body: () => `key-${x}`
    if (body && (body.type === 'Literal' || body.type === 'TemplateLiteral')) {
      return true
    }
    // Arrow with block body that returns a literal
    if (body && body.type === 'BlockStatement' && body.body) {
      for (const stmt of body.body) {
        if (stmt.type === 'ReturnStatement' && stmt.argument) {
          if (stmt.argument.type === 'Literal' || stmt.argument.type === 'TemplateLiteral') {
            return true
          }
        }
      }
    }
    return false
  }

  // Function expression that returns a string
  if (node.type === 'FunctionExpression') {
    const body = node.body
    if (body && body.type === 'BlockStatement' && body.body) {
      for (const stmt of body.body) {
        if (stmt.type === 'ReturnStatement' && stmt.argument) {
          if (stmt.argument.type === 'Literal' || stmt.argument.type === 'TemplateLiteral') {
            return true
          }
        }
      }
    }
    return false
  }

  // Identifier - computed ref or variable
  // By default, asyncData requires stable keys, so Identifiers should be rejected
  if (node.type === 'Identifier') {
    return false
  }

  return false
}

export default {
  meta: {
    type: 'problem' as const,
    docs: {
      description: 'enforce valid useAsyncData usage',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          requireStableAsyncDataKeys: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      missingCallback:
        'useAsyncData requires a callback function as second argument. See: {{docUrl}}',
      missingKey: 'useAsyncData requires a key as first argument. See: {{docUrl}}',
      keyNotLiteral:
        'useAsyncData key should be a string literal for stable caching. See: {{docUrl}}',
      callbackReturnsNothing: 'useAsyncData callback should return a value. See: {{docUrl}}',
    },
  },
  create(context: Rule.RuleContext): Rule.RuleListener {
    const options = context.options[0] || {}
    const requireStableKeys = options.requireStableAsyncDataKeys !== false

    const useAsyncDataSpec = getApiSpec('useAsyncData')
    const docUrl =
      useAsyncDataSpec?.docUrl || 'https://nuxt.com/docs/api/composables/use-async-data'

    return {
      CallExpression(node: any) {
        if (
          !node.callee ||
          (node.callee.type !== 'Identifier' && node.callee.type !== 'MemberExpression') ||
          (node.callee.type === 'Identifier' && node.callee.name !== 'useAsyncData') ||
          (node.callee.type === 'MemberExpression' &&
            node.callee.property &&
            node.callee.property.name !== 'useAsyncData')
        ) {
          return
        }

        const args = node.arguments || []

        // Check for key (first arg)
        if (args.length === 0) {
          context.report({
            node,
            messageId: 'missingKey',
            data: { docUrl },
          })
          return
        }

        // Check if key is literal or a getter function (if required)
        // Valid patterns:
        // - String literal: 'my-key'
        // - Template literal: `game-${id}`
        // - Getter function: () => `game-${id.value}`
        if (requireStableKeys && !isValidAsyncDataKey(args[0])) {
          context.report({
            node: args[0],
            messageId: 'keyNotLiteral',
            data: { docUrl },
          })
        }

        // Check for callback (second arg)
        if (args.length < 2) {
          context.report({
            node,
            messageId: 'missingCallback',
            data: { docUrl },
          })
          return
        }

        const callback = args[1]

        // Check if callback is a function
        if (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression') {
          context.report({
            node: callback,
            messageId: 'missingCallback',
            data: { docUrl },
          })
          return
        }

        // Check if callback returns something (basic check)
        // This is a heuristic - we can't always determine if a function returns a value
        // But we can check for explicit return statements
        if (callback.body) {
          const hasReturn = (body: any): boolean => {
            if (body.type === 'BlockStatement') {
              for (const stmt of body.body) {
                if (stmt.type === 'ReturnStatement') {
                  return true
                }
                if (stmt.type === 'IfStatement' && stmt.consequent) {
                  if (hasReturn(stmt.consequent)) return true
                  if (stmt.alternate && hasReturn(stmt.alternate)) return true
                }
              }
              return false
            }
            // Arrow function with expression body always returns
            return body.type !== 'BlockStatement'
          }

          // Only warn if it's a block statement with no return
          if (callback.body.type === 'BlockStatement' && !hasReturn(callback.body)) {
            // This is a warning, not an error, since async functions might return promises
            // We'll skip this check to avoid false positives
          }
        }
      },
    }
  },
}
