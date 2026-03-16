/**
 * Rule: nuxt-ui/prefer-loading-auto
 *
 * Warns when using manual :loading prop on UButton type="submit"
 * instead of the loading-auto prop which handles loading state automatically
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
      description: 'prefer loading-auto prop on UButton for automatic loading state',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [],
    messages: {
      preferLoadingAuto:
        'Use loading-auto instead of :loading on submit buttons for automatic loading state. See: https://ui.nuxt.com/components/button#loading-auto',
      preferLoadingAutoOnClick:
        'Consider using loading-auto with async @click handler instead of manual :loading state',
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

        // Only check UButton components
        if (vElement.name.toLowerCase() !== 'ubutton') {
          return
        }

        const attributes = vElement.startTag.attributes

        // Check for attributes
        let hasLoading = false
        let hasLoadingAuto = false
        let isSubmitButton = false
        let loadingAttr: AST.VAttribute | AST.VDirective | null = null

        for (const attr of attributes) {
          if (attr.type === 'VAttribute') {
            // Check for type="submit"
            if (
              attr.key.name === 'type' &&
              attr.value?.type === 'VLiteral' &&
              attr.value.value === 'submit'
            ) {
              isSubmitButton = true
            }
            // Check for loading-auto
            if (attr.key.name === 'loading-auto' || attr.key.name === 'loadingAuto') {
              hasLoadingAuto = true
            }
          } else if (attr.type === 'VDirective') {
            // Check for :loading or v-bind:loading
            if (attr.key.name.name === 'bind' && attr.key.argument?.type === 'VIdentifier') {
              if (attr.key.argument.name === 'loading') {
                hasLoading = true
                loadingAttr = attr
              }
            }
          }
        }

        // If it's a submit button with :loading but not loading-auto, warn
        if (isSubmitButton && hasLoading && !hasLoadingAuto && loadingAttr) {
          context.report({
            node: loadingAttr,
            messageId: 'preferLoadingAuto',
          })
        }
      },
    })
  },
}
