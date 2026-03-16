/**
 * Rule: nuxt-guardrails/no-legacy-head
 *
 * Detects Vue Options API head() method or head: {} option
 * and guides toward useHead() composable
 */

import type { AST } from 'vue-eslint-parser'
import type { Rule } from 'eslint'
import { getApiSpec } from '../utils/spec-loader'

export default {
  meta: {
    type: 'problem' as const,
    docs: {
      description: 'disallow legacy Options API head() method or head option',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code' as const,
    schema: [],
    messages: {
      legacyHeadMethod: 'Use useHead() composable instead of head() method. See: {{docUrl}}',
      legacyHeadOption: 'Use useHead() composable instead of head option. See: {{docUrl}}',
    },
  },
  create(context: Rule.RuleContext): Rule.RuleListener {
    const parserServices = context.sourceCode?.parserServices as any

    // Only process Vue files
    if (!parserServices || !parserServices.defineTemplateBodyVisitor) {
      return {}
    }

    const useHeadSpec = getApiSpec('useHead')
    const docUrl = useHeadSpec?.docUrl || 'https://nuxt.com/docs/api/composables/use-head'

    return parserServices.defineTemplateBodyVisitor(
      {},
      {
        // Check script block for Options API patterns
        'Program:exit'(node: AST.ESLintProgram) {
          // Find export default with Options API
          for (const statement of node.body) {
            if (
              statement.type === 'ExportDefaultDeclaration' &&
              statement.declaration &&
              statement.declaration.type === 'ObjectExpression'
            ) {
              const obj = statement.declaration

              // Check for head: {} option
              for (const prop of obj.properties) {
                if (
                  prop.type === 'Property' &&
                  prop.key &&
                  ((prop.key.type === 'Identifier' && prop.key.name === 'head') ||
                    (prop.key.type === 'Literal' && prop.key.value === 'head'))
                ) {
                  if (prop.method) continue
                  context.report({
                    node: prop,
                    messageId: 'legacyHeadOption',
                    data: { docUrl },
                  })
                }
              }
            }
          }
        },

        // Check for head() method
        'Property[key.name="head"]'(node: any) {
          if (
            node.method &&
            node.parent?.type === 'ObjectExpression' &&
            node.parent.parent?.type === 'ExportDefaultDeclaration'
          ) {
            context.report({
              node,
              messageId: 'legacyHeadMethod',
              data: { docUrl },
            })
          }
        },
      },
    )
  },
}
