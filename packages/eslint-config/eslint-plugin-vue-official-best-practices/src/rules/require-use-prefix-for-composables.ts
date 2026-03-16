/**
 * Rule: vue-official/require-use-prefix-for-composables
 *
 * Enforces composable functions are named with "use" prefix
 */

import type { RuleContext, RuleListener } from 'eslint'
import { VUE_STYLE_GUIDE } from '../utils/vue-docs-urls'

const DEFAULT_COMPOSABLE_PATHS = ['**/composables/**/*.ts', '**/composables/**/*.js']

export default {
  meta: {
    type: 'suggestion' as const,
    docs: {
      description: 'require composable functions to use "use" prefix',
      category: 'Best Practices',
      recommended: true,
      url: VUE_STYLE_GUIDE,
    },
    schema: [
      {
        type: 'object',
        properties: {
          paths: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      requireUsePrefix:
        'Composable functions should be named with "use" prefix (e.g., useXxx). See: {{url}}',
    },
  },
  create(context: RuleContext<string, any[]>): RuleListener {
    const filename = context.filename ?? context.getFilename?.()
    const options = context.options[0] || {}
    const paths = options.paths || DEFAULT_COMPOSABLE_PATHS

    // Check if file matches composable paths
    const isComposableFile = paths.some((pattern: string) => {
      return filename.includes('composable') || filename.includes('use')
    })

    if (!isComposableFile) {
      return {}
    }

    // Track function declarations to avoid false positives on type/constant exports
    const functionNames = new Set<string>()

    return {
      // Track function declarations and expressions
      FunctionDeclaration(node: any) {
        if (node.id?.name) {
          functionNames.add(node.id.name)
        }
      },
      VariableDeclarator(node: any) {
        // Track variable declarations that are functions
        if (
          node.id?.name &&
          node.init &&
          (node.init.type === 'FunctionExpression' || node.init.type === 'ArrowFunctionExpression')
        ) {
          functionNames.add(node.id.name)
        }
      },
      ExportDefaultDeclaration(node: any) {
        // Check default export function name
        if (
          node.declaration &&
          (node.declaration.type === 'FunctionDeclaration' ||
            node.declaration.type === 'FunctionExpression' ||
            node.declaration.type === 'ArrowFunctionExpression')
        ) {
          const funcName =
            node.declaration.id?.name ||
            (node.declaration.type === 'FunctionExpression' && node.declaration.id?.name)

          if (funcName && !funcName.startsWith('use')) {
            context.report({
              node: node.declaration.id || node,
              messageId: 'requireUsePrefix',
              data: { url: VUE_STYLE_GUIDE },
            })
          }
        }
      },
      ExportNamedDeclaration(node: any) {
        // Check named export function declarations
        if (node.declaration && node.declaration.type === 'FunctionDeclaration') {
          const funcName = node.declaration.id?.name
          if (funcName && !funcName.startsWith('use')) {
            context.report({
              node: node.declaration.id || node,
              messageId: 'requireUsePrefix',
              data: { url: VUE_STYLE_GUIDE },
            })
          }
        }

        // Check named export variable declarations that are functions
        if (node.declaration && node.declaration.type === 'VariableDeclaration') {
          node.declaration.declarations.forEach((decl: any) => {
            if (
              decl.id?.name &&
              decl.init &&
              (decl.init.type === 'FunctionExpression' ||
                decl.init.type === 'ArrowFunctionExpression') &&
              !decl.id.name.startsWith('use')
            ) {
              context.report({
                node: decl.id,
                messageId: 'requireUsePrefix',
                data: { url: VUE_STYLE_GUIDE },
              })
            }
          })
        }

        // Check named exports in specifiers - only report if it's a known function
        if (node.specifiers) {
          node.specifiers.forEach((spec: any) => {
            if (
              spec.type === 'ExportSpecifier' &&
              spec.exported &&
              !spec.exported.name.startsWith('use')
            ) {
              // Only warn if we've seen this name declared as a function
              // This avoids false positives for type/interface/constant exports
              const exportedName = spec.local.name
              if (functionNames.has(exportedName)) {
                context.report({
                  node: spec.exported,
                  messageId: 'requireUsePrefix',
                  data: { url: VUE_STYLE_GUIDE },
                })
              }
            }
          })
        }
      },
    }
  },
}
