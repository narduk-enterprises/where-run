/**
 * AST utility functions for ESLint rules
 */

import type { AST } from 'vue-eslint-parser'
import type { Rule } from 'eslint'

/**
 * Check if a node is in a client-only context
 */
export function isInClientContext(node: any, _context: Rule.RuleContext): boolean {
  let current: any = node.parent

  while (current) {
    // Check for import.meta.client guard
    if (
      current.type === 'IfStatement' &&
      current.test &&
      (isImportMetaClient(current.test) || isImportMetaServer(current.test))
    ) {
      return isImportMetaClient(current.test)
    }

    // Check for early return pattern: if (!import.meta.client) return ...; window...
    if (
      current.type === 'IfStatement' &&
      current.test &&
      current.test.type === 'UnaryExpression' &&
      current.test.operator === '!' &&
      isImportMetaClient(current.test.argument)
    ) {
      // This is a guard that returns early if NOT client, so the code after is client-only
      return true
    }

    // Check for lifecycle hooks (client-only)
    if (
      current.type === 'CallExpression' &&
      current.callee &&
      (current.callee.name === 'onMounted' ||
        current.callee.name === 'onUnmounted' ||
        current.callee.name === 'onBeforeUnmount' ||
        current.callee.name === 'onUpdated' ||
        current.callee.name === 'onBeforeUpdate')
    ) {
      return true
    }

    current = current.parent
  }

  return false
}

/**
 * Check if an expression is import.meta.client
 */
export function isImportMetaClient(node: any): boolean {
  // import.meta.client AST structure:
  // MemberExpression
  //   object: MetaProperty { meta: { name: 'import' }, property: { name: 'meta' } }
  //   property: Identifier { name: 'client' }
  return (
    node.type === 'MemberExpression' &&
    node.object &&
    node.object.type === 'MetaProperty' &&
    node.object.meta &&
    node.object.meta.name === 'import' &&
    node.object.property &&
    node.object.property.name === 'meta' &&
    node.property &&
    node.property.name === 'client'
  )
}

/**
 * Check if an expression is import.meta.server
 */
export function isImportMetaServer(node: any): boolean {
  // import.meta.server AST structure:
  // MemberExpression
  //   object: MetaProperty { meta: { name: 'import' }, property: { name: 'meta' } }
  //   property: Identifier { name: 'server' }
  return (
    node.type === 'MemberExpression' &&
    node.object &&
    node.object.type === 'MetaProperty' &&
    node.object.meta &&
    node.object.meta.name === 'import' &&
    node.object.property &&
    node.object.property.name === 'meta' &&
    node.property &&
    node.property.name === 'server'
  )
}

/**
 * Check if an expression is process.client
 */
export function isProcessClient(node: any): boolean {
  return (
    node.type === 'MemberExpression' &&
    node.object &&
    node.object.type === 'Identifier' &&
    node.object.name === 'process' &&
    node.property &&
    node.property.name === 'client'
  )
}

/**
 * Check if an expression is process.server
 */
export function isProcessServer(node: any): boolean {
  return (
    node.type === 'MemberExpression' &&
    node.object &&
    node.object.type === 'Identifier' &&
    node.object.name === 'process' &&
    node.property &&
    node.property.name === 'server'
  )
}

/**
 * Check if a node accesses window, document, or localStorage
 */
export function isDomAccess(node: any): {
  type: 'window' | 'document' | 'localStorage' | null
  member: string | null
} {
  if (node.type !== 'MemberExpression') {
    return { type: null, member: null }
  }

  if (node.object && node.object.type === 'Identifier' && node.object.name === 'window') {
    return {
      type: 'window',
      member: node.property && node.property.name ? node.property.name : null,
    }
  }

  if (node.object && node.object.type === 'Identifier' && node.object.name === 'document') {
    return {
      type: 'document',
      member: node.property && node.property.name ? node.property.name : null,
    }
  }

  if (node.object && node.object.type === 'Identifier' && node.object.name === 'localStorage') {
    return {
      type: 'localStorage',
      member: node.property && node.property.name ? node.property.name : null,
    }
  }

  return { type: null, member: null }
}

/**
 * Get the script AST from a Vue file
 */
export function getScriptAST(ast: AST.ESLintProgram): any {
  // Find script setup or script block
  for (const node of ast.body) {
    if (node.type === 'ExpressionStatement' && node.expression) {
      // This might be a script setup
      return ast
    }
  }

  return ast
}

/**
 * Check if a string is a literal value (including template literals)
 */
export function isLiteral(node: any): boolean {
  return node.type === 'Literal' || node.type === 'TemplateLiteral'
}
