/**
 * Rule: vue-official/consistent-defineprops-emits
 *
 * Ensures defineProps and defineEmits are called once at top-level
 */

import type { RuleContext, RuleListener } from 'eslint'
import { VUE_COMPOSITION_API } from '../utils/vue-docs-urls'
import { isTopLevel } from '../utils/ast-utils'

export default {
  meta: {
    type: 'problem' as const,
    docs: {
      description: 'enforce consistent defineProps and defineEmits usage',
      category: 'Best Practices',
      recommended: true,
      url: VUE_COMPOSITION_API,
    },
    schema: [],
    messages: {
      multipleDefineProps: 'defineProps() should be called only once at top-level. See: {{url}}',
      multipleDefineEmits: 'defineEmits() should be called only once at top-level. See: {{url}}',
      notTopLevel:
        'defineProps() and defineEmits() must be called at top-level of <script setup>. See: {{url}}',
    },
  },
  create(context: RuleContext<string, any[]>): RuleListener {
    const parserServices = (context.sourceCode?.parserServices ?? context.parserServices) as any

    if (!parserServices || !parserServices.defineTemplateBodyVisitor) {
      // For non-Vue files, check directly
      let definePropsCount = 0
      let defineEmitsCount = 0
      const definePropsNodes: any[] = []
      const defineEmitsNodes: any[] = []

      return {
        CallExpression(node: any) {
          if (
            node.callee &&
            node.callee.type === 'Identifier' &&
            node.callee.name === 'defineProps'
          ) {
            if (!isTopLevel(node)) {
              context.report({
                node,
                messageId: 'notTopLevel',
                data: { url: VUE_COMPOSITION_API },
              })
              return
            }

            definePropsCount++
            definePropsNodes.push(node)
          }

          if (
            node.callee &&
            node.callee.type === 'Identifier' &&
            node.callee.name === 'defineEmits'
          ) {
            if (!isTopLevel(node)) {
              context.report({
                node,
                messageId: 'notTopLevel',
                data: { url: VUE_COMPOSITION_API },
              })
              return
            }

            defineEmitsCount++
            defineEmitsNodes.push(node)
          }
        },
        'Program:exit'() {
          // Report multiple defineProps
          if (definePropsCount > 1) {
            definePropsNodes.slice(1).forEach((node) => {
              context.report({
                node,
                messageId: 'multipleDefineProps',
                data: { url: VUE_COMPOSITION_API },
              })
            })
          }

          // Report multiple defineEmits
          if (defineEmitsCount > 1) {
            defineEmitsNodes.slice(1).forEach((node) => {
              context.report({
                node,
                messageId: 'multipleDefineEmits',
                data: { url: VUE_COMPOSITION_API },
              })
            })
          }
        },
      }
    }

    let definePropsCount = 0
    let defineEmitsCount = 0
    const definePropsNodes: any[] = []
    const defineEmitsNodes: any[] = []

    const scriptVisitor = {
      CallExpression(node: any) {
        if (
          node.callee &&
          node.callee.type === 'Identifier' &&
          node.callee.name === 'defineProps'
        ) {
          if (!isTopLevel(node)) {
            context.report({
              node,
              messageId: 'notTopLevel',
              data: { url: VUE_COMPOSITION_API },
            })
            return
          }

          definePropsCount++
          definePropsNodes.push(node)
        }

        if (
          node.callee &&
          node.callee.type === 'Identifier' &&
          node.callee.name === 'defineEmits'
        ) {
          if (!isTopLevel(node)) {
            context.report({
              node,
              messageId: 'notTopLevel',
              data: { url: VUE_COMPOSITION_API },
            })
            return
          }

          defineEmitsCount++
          defineEmitsNodes.push(node)
        }
      },
    }

    const baseVisitor = parserServices.defineTemplateBodyVisitor({}, scriptVisitor)

    // Add Program:exit to check for multiple calls
    return {
      ...baseVisitor,
      'Program:exit'() {
        // Report multiple defineProps
        if (definePropsCount > 1) {
          definePropsNodes.slice(1).forEach((node) => {
            context.report({
              node,
              messageId: 'multipleDefineProps',
              data: { url: VUE_COMPOSITION_API },
            })
          })
        }

        // Report multiple defineEmits
        if (defineEmitsCount > 1) {
          defineEmitsNodes.slice(1).forEach((node) => {
            context.report({
              node,
              messageId: 'multipleDefineEmits',
              data: { url: VUE_COMPOSITION_API },
            })
          })
        }
      },
    }
  },
}
