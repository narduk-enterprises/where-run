/**
 * Rule: nuxt-guardrails/no-ssr-dom-access
 *
 * Detects unguarded window/document/localStorage access in server context
 */

import type { Rule } from 'eslint'
import { isDomAccess, isInClientContext, isImportMetaClient } from '../utils/ast-utils'

export default {
  meta: {
    type: 'problem' as const,
    docs: {
      description: 'disallow unguarded DOM access in server context',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [],
    messages: {
      unguardedDomAccess:
        'Unguarded {{type}} access may cause SSR errors. Use onMounted() or guard with import.meta.client. See: https://nuxt.com/docs/4.x/guide/concepts/rendering',
    },
  },
  create(context: Rule.RuleContext): Rule.RuleListener {
    const filename = context.filename ?? (context as any).getFilename?.() ?? ''
    const parserServices = (context.sourceCode?.parserServices ??
      (context as any).parserServices) as any

    // Skip client-only files
    if (filename.includes('.client.') || filename.includes('.client/')) {
      return {}
    }

    // Skip e2e test files
    if (
      filename.includes('e2e/') ||
      filename.includes('.spec.ts') ||
      filename.includes('.test.ts')
    ) {
      return {}
    }

    // For Vue files, only check script, not template
    const isVueFile = filename.endsWith('.vue')

    return {
      MemberExpression(node: any) {
        // Skip if this is in a Vue template (not script)
        if (isVueFile && parserServices && parserServices.getTemplateBodyTokenStore) {
          // This is a Vue file - check if node is in template
          // Template nodes have different structure, but we can check if it's a VElement
          let current: any = node.parent
          while (current) {
            // VElement indicates we're in template
            if (current.type && current.type.startsWith('V')) {
              return // Skip template code
            }
            current = current.parent
          }
        }
        const domInfo = isDomAccess(node)

        if (!domInfo.type) {
          return
        }

        // Allow if in client context
        if (isInClientContext(node, context)) {
          return
        }

        // Check for early return guard in the same block
        // This checks if there's an early return with !import.meta.client before this node
        let checkNode: any = node

        // Walk up to find the containing function block
        while (checkNode) {
          if (checkNode.type === 'BlockStatement' && checkNode.body) {
            // Check all statements in this block that come before or contain our node
            const nodePos = node.range ? node.range[0] : null
            if (nodePos) {
              for (const stmt of checkNode.body) {
                if (!stmt.range) continue
                // Stop when we pass the node; later statements cannot guard it
                if (stmt.range[0] > nodePos) break

                // Check for: if (!import.meta.client) return
                if (
                  stmt.type === 'IfStatement' &&
                  stmt.test &&
                  stmt.test.type === 'UnaryExpression' &&
                  stmt.test.operator === '!' &&
                  isImportMetaClient(stmt.test.argument) &&
                  (stmt.consequent.type === 'ReturnStatement' ||
                    (stmt.consequent.type === 'BlockStatement' &&
                      stmt.consequent.body.some((s: any) => s.type === 'ReturnStatement')))
                ) {
                  return // Found early return guard
                }
                // Check for: if (x || !import.meta.client) return
                if (
                  stmt.type === 'IfStatement' &&
                  stmt.test &&
                  stmt.test.type === 'LogicalExpression' &&
                  ((stmt.test.left &&
                    stmt.test.left.type === 'UnaryExpression' &&
                    stmt.test.left.operator === '!' &&
                    isImportMetaClient(stmt.test.left.argument)) ||
                    (stmt.test.right &&
                      stmt.test.right.type === 'UnaryExpression' &&
                      stmt.test.right.operator === '!' &&
                      isImportMetaClient(stmt.test.right.argument))) &&
                  (stmt.consequent.type === 'ReturnStatement' ||
                    (stmt.consequent.type === 'BlockStatement' &&
                      stmt.consequent.body.some((s: any) => s.type === 'ReturnStatement')))
                ) {
                  return // Found early return guard
                }
              }
            }
            break
          }
          // Also check function bodies
          if (
            checkNode.type === 'FunctionDeclaration' ||
            checkNode.type === 'FunctionExpression' ||
            checkNode.type === 'ArrowFunctionExpression'
          ) {
            const body = checkNode.body
            if (body && body.type === 'BlockStatement' && body.body) {
              const nodePos = node.range ? node.range[0] : null
              if (nodePos) {
                for (const stmt of body.body) {
                  if (!stmt.range) continue
                  // Stop when we pass the node; later statements cannot guard it
                  if (stmt.range[0] > nodePos) break

                  // Same checks as above
                  if (
                    stmt.type === 'IfStatement' &&
                    stmt.test &&
                    stmt.test.type === 'UnaryExpression' &&
                    stmt.test.operator === '!' &&
                    isImportMetaClient(stmt.test.argument) &&
                    (stmt.consequent.type === 'ReturnStatement' ||
                      (stmt.consequent.type === 'BlockStatement' &&
                        stmt.consequent.body.some((s: any) => s.type === 'ReturnStatement')))
                  ) {
                    return
                  }
                  if (
                    stmt.type === 'IfStatement' &&
                    stmt.test &&
                    stmt.test.type === 'LogicalExpression' &&
                    ((stmt.test.left &&
                      stmt.test.left.type === 'UnaryExpression' &&
                      stmt.test.left.operator === '!' &&
                      isImportMetaClient(stmt.test.left.argument)) ||
                      (stmt.test.right &&
                        stmt.test.right.type === 'UnaryExpression' &&
                        stmt.test.right.operator === '!' &&
                        isImportMetaClient(stmt.test.right.argument))) &&
                    (stmt.consequent.type === 'ReturnStatement' ||
                      (stmt.consequent.type === 'BlockStatement' &&
                        stmt.consequent.body.some((s: any) => s.type === 'ReturnStatement')))
                  ) {
                    return
                  }
                }
              }
              break
            }
          }
          checkNode = checkNode.parent
        }

        // Check if we're in a computed/arrow function with early return
        let current: any = node.parent
        while (current) {
          // Check if we're inside an arrow function
          if (current.type === 'ArrowFunctionExpression') {
            const body = current.body
            if (body && body.type === 'BlockStatement') {
              // Check for early return in block before our node
              for (const stmt of body.body) {
                // Stop when we reach a statement that contains our node
                if (
                  stmt.range &&
                  node.range &&
                  stmt.range[0] <= node.range[0] &&
                  stmt.range[1] >= node.range[1]
                ) {
                  break
                }
                // Check for early return pattern
                if (
                  stmt.type === 'IfStatement' &&
                  stmt.test &&
                  stmt.test.type === 'UnaryExpression' &&
                  stmt.test.operator === '!' &&
                  isImportMetaClient(stmt.test.argument) &&
                  (stmt.consequent.type === 'ReturnStatement' ||
                    (stmt.consequent.type === 'BlockStatement' &&
                      stmt.consequent.body.some((s: any) => s.type === 'ReturnStatement')))
                ) {
                  // This early return comes before our node
                  return // Guarded by early return
                }
              }
            } else if (body && body.type === 'ConditionalExpression') {
              // Arrow function with ternary: x ? y : z
              if (
                body.test &&
                body.test.type === 'UnaryExpression' &&
                body.test.operator === '!' &&
                isImportMetaClient(body.test.argument)
              ) {
                return // Guarded by conditional
              }
            }
          }

          // Check if we're inside a computed() call
          if (
            current.type === 'CallExpression' &&
            current.callee &&
            current.callee.name === 'computed'
          ) {
            const arg = current.arguments && current.arguments[0]
            if (arg && arg.type === 'ArrowFunctionExpression') {
              const body = arg.body
              if (body && body.type === 'BlockStatement') {
                // Check for early return in block before our node
                for (const stmt of body.body) {
                  // Stop when we reach a statement that contains our node
                  if (
                    stmt.range &&
                    node.range &&
                    stmt.range[0] <= node.range[0] &&
                    stmt.range[1] >= node.range[1]
                  ) {
                    break
                  }
                  // Check for early return pattern
                  if (
                    stmt.type === 'IfStatement' &&
                    stmt.test &&
                    stmt.test.type === 'UnaryExpression' &&
                    stmt.test.operator === '!' &&
                    isImportMetaClient(stmt.test.argument) &&
                    (stmt.consequent.type === 'ReturnStatement' ||
                      (stmt.consequent.type === 'BlockStatement' &&
                        stmt.consequent.body.some((s: any) => s.type === 'ReturnStatement')))
                  ) {
                    // This early return comes before our node
                    return // Guarded by early return
                  }
                }
              }
            }
          }

          // Check if parent is a conditional with import.meta.client
          if (current.type === 'IfStatement' && current.test) {
            // Check if test is import.meta.client or contains it (e.g., x && import.meta.client)
            if (isImportMetaClient(current.test)) {
              return // Guarded by import.meta.client
            }
            // Check for logical expressions like: x && import.meta.client
            if (
              current.test.type === 'LogicalExpression' &&
              (isImportMetaClient(current.test.left) || isImportMetaClient(current.test.right))
            ) {
              return // Guarded by import.meta.client in logical expression
            }
          }

          current = current.parent
        }

        context.report({
          node,
          messageId: 'unguardedDomAccess',
          data: { type: domInfo.type },
        })
      },
    }
  },
}
