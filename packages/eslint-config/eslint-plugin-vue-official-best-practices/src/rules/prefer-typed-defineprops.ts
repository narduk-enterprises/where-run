/**
 * Rule: vue-official/prefer-typed-defineprops
 *
 * Encourages typed defineProps in TypeScript
 */

import type { RuleContext, RuleListener } from 'eslint'
import { VUE_TYPESCRIPT_GUIDE } from '../utils/vue-docs-urls'

export default {
  meta: {
    type: 'suggestion' as const,
    docs: {
      description: 'prefer typed defineProps in TypeScript',
      category: 'Best Practices',
      recommended: true,
      url: VUE_TYPESCRIPT_GUIDE,
    },
    schema: [],
    messages: {
      preferTypedProps: 'Prefer typed defineProps<{...}>() for better type safety. See: {{url}}',
    },
  },
  create(context: RuleContext<string, any[]>): RuleListener {
    const parserServices = (context.sourceCode?.parserServices ?? context.parserServices) as any
    const filename = context.filename ?? context.getFilename?.()

    // Only apply to TypeScript files
    const isTypeScript = filename.endsWith('.ts') || filename.endsWith('.vue')

    if (!isTypeScript) {
      return {}
    }

    if (!parserServices || !parserServices.defineTemplateBodyVisitor) {
      // For .ts files, check directly
      if (filename.endsWith('.ts')) {
        return {
          CallExpression(node: any) {
            if (
              node.callee &&
              node.callee.type === 'Identifier' &&
              node.callee.typeParameters === undefined &&
              node.callee.typeArguments === undefined &&
              node.typeParameters === undefined &&
              node.typeArguments === undefined &&
              node.callee.name === 'defineProps'
            ) {
              context.report({
                node,
                messageId: 'preferTypedProps',
                data: { url: VUE_TYPESCRIPT_GUIDE },
              })
            }
          },
        }
      }
      return {}
    }

    return parserServices.defineTemplateBodyVisitor(
      {},
      {
        CallExpression(node: any) {
          // Check for defineProps() without type parameter
          if (
            node.callee &&
            node.callee.type === 'Identifier' &&
            node.callee.name === 'defineProps' &&
            node.callee.typeParameters === undefined &&
            node.callee.typeArguments === undefined &&
            node.typeParameters === undefined &&
            node.typeArguments === undefined
          ) {
            // Check if it's using runtime props (object literal) vs typed props
            if (node.arguments.length > 0) {
              const firstArg = node.arguments[0]
              // If first arg is an object literal, it's runtime props
              if (firstArg.type === 'ObjectExpression') {
                context.report({
                  node,
                  messageId: 'preferTypedProps',
                  data: { url: VUE_TYPESCRIPT_GUIDE },
                })
              }
            } else {
              // No arguments and no type params - suggest typed version
              context.report({
                node,
                messageId: 'preferTypedProps',
                data: { url: VUE_TYPESCRIPT_GUIDE },
              })
            }
          }
        },
      },
    )
  },
}
