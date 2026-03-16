/**
 * Rule: vue-official/prefer-shallow-watch
 *
 * Warns against deep watches for performance
 */

import type { RuleContext, RuleListener } from 'eslint'
import { VUE_BEST_PRACTICES } from '../utils/vue-docs-urls'

export default {
  meta: {
    type: 'suggestion' as const,
    docs: {
      description: 'prefer shallow watch over deep watch',
      category: 'Performance',
      recommended: true,
      url: VUE_BEST_PRACTICES,
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
      preferShallowWatch:
        'Avoid deep watches when possible for performance. Use /* vue-official allow-deep-watch */ to suppress. See: {{url}}',
    },
  },
  create(context: RuleContext<string, any[]>): RuleListener {
    const parserServices = (context.sourceCode?.parserServices ?? context.parserServices) as any
    const options = context.options[0] || {}
    const strict = options.strict !== false // Default: true

    if (!parserServices || !parserServices.defineTemplateBodyVisitor) {
      return {}
    }

    const checkForDeepWatch = (node: any) => {
      // Check for watch() or watchEffect() calls
      if (
        node.type === 'CallExpression' &&
        node.callee &&
        node.callee.type === 'Identifier' &&
        (node.callee.name === 'watch' || node.callee.name === 'watchEffect')
      ) {
        // Check for options with deep: true
        const optionsArg = node.arguments[node.arguments.length - 1]

        if (optionsArg && optionsArg.type === 'ObjectExpression') {
          const hasDeep = optionsArg.properties.some((prop: any) => {
            const key = prop.key?.name || prop.key?.value
            return key === 'deep' && prop.value?.value === true
          })

          if (hasDeep) {
            // Check for suppression comment
            const sourceCode = context.sourceCode ?? (context as any).getSourceCode()
            const comments = sourceCode.getCommentsBefore(node)

            const hasSuppression = comments.some((comment: any) =>
              comment.value.includes('vue-official allow-deep-watch'),
            )

            if (!hasSuppression && strict) {
              context.report({
                node,
                messageId: 'preferShallowWatch',
                data: { url: VUE_BEST_PRACTICES },
              })
            }
          }
        }
      }
    }

    return parserServices.defineTemplateBodyVisitor(
      {},
      {
        CallExpression: checkForDeepWatch,
      },
    )
  },
}
