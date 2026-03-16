/**
 * Rule: nuxt-ui/prefer-uform
 *
 * Warns when using native <form> element instead of <UForm>
 * UForm provides validation, loading-auto, and better integration
 */

import type { AST } from 'vue-eslint-parser'

interface RuleContext {
  report: (_options: {
    node: AST.Node
    messageId: string
    data?: Record<string, string>
    fix?: (_fixer: { replaceText: (_node: AST.Node, _text: string) => unknown }) => unknown
  }) => void
  sourceCode: {
    parserServices?: {
      defineTemplateBodyVisitor: (
        visitor: Record<string, (node: AST.Node) => void>,
        scriptVisitor?: Record<string, (node: AST.Node) => void>,
      ) => Record<string, (node: AST.Node) => void>
    }
    getText: (_node?: AST.Node) => string
  }
}

export default {
  meta: {
    type: 'suggestion' as const,
    docs: {
      description: 'prefer UForm over native form element for better Nuxt UI integration',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code' as const,
    schema: [],
    messages: {
      preferUForm:
        'Use <UForm> instead of native <form> for validation and loading-auto support. See: https://ui.nuxt.com/components/form',
    },
  },
  create(context: RuleContext) {
    const parserServices = context.sourceCode?.parserServices
    if (!parserServices || !parserServices.defineTemplateBodyVisitor) {
      return {}
    }

    return parserServices.defineTemplateBodyVisitor({
      VElement(node: AST.Node) {
        const vElement = node as AST.VElement

        // Check if it's a native form element
        if (vElement.name === 'form') {
          context.report({
            node: vElement.startTag,
            messageId: 'preferUForm',
          })
        }
      },
    })
  },
}
