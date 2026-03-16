/**
 * Rule: nuxt-guardrails/no-legacy-fetch-hook
 *
 * Detects Nuxt 2 fetch() hook and guides toward useFetch/useAsyncData
 */

import type { Rule } from 'eslint'
import { getApiSpec } from '../utils/spec-loader'

export default {
  meta: {
    type: 'problem' as const,
    docs: {
      description: 'disallow legacy Nuxt 2 fetch() hook',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [],
    messages: {
      legacyFetch: 'Use useFetch() or useAsyncData() instead of fetch() hook. See: {{docUrl}}',
    },
  },
  create(context: Rule.RuleContext): Rule.RuleListener {
    const parserServices = context.sourceCode?.parserServices as any

    if (!parserServices || !parserServices.defineTemplateBodyVisitor) {
      return {}
    }

    const useFetchSpec = getApiSpec('useFetch')
    const useAsyncDataSpec = getApiSpec('useAsyncData')
    const docUrl =
      useFetchSpec?.docUrl ||
      useAsyncDataSpec?.docUrl ||
      'https://nuxt.com/docs/api/composables/use-fetch'

    return parserServices.defineTemplateBodyVisitor(
      {},
      {
        // Check for fetch() method in Options API
        'Property[key.name="fetch"]'(node: any) {
          if (
            node.method &&
            node.parent?.type === 'ObjectExpression' &&
            node.parent.parent?.type === 'ExportDefaultDeclaration'
          ) {
            context.report({
              node,
              messageId: 'legacyFetch',
              data: { docUrl },
            })
          }
        },
      },
    )
  },
}
