/**
 * Rule: vue-official/pinia-prefer-storeToRefs-destructure
 *
 * Warns when destructuring store properties without storeToRefs
 */

import type { RuleContext, RuleListener } from 'eslint'
import { PINIA_DOCS } from '../utils/vue-docs-urls'

export default {
  meta: {
    type: 'suggestion' as const,
    docs: {
      description: 'prefer storeToRefs when destructuring reactive store properties',
      category: 'Best Practices',
      recommended: true,
      url: PINIA_DOCS,
    },
    schema: [],
    fixable: 'code' as const,
    messages: {
      preferStoreToRefs:
        'Destructure reactive store properties with storeToRefs() to maintain reactivity. See: {{url}}',
    },
  },
  create(context: RuleContext<string, any[]>): RuleListener {
    return {
      VariableDeclarator(node: any) {
        // Check for destructuring pattern: const { prop } = store
        if (node.id && node.id.type === 'ObjectPattern' && node.init) {
          const init = node.init

          // Check if RHS is a Pinia store call (useXxxStore() where name ends with 'Store')
          // Only flag if the function name ends with 'Store' to avoid false positives with composables
          if (
            init.type === 'CallExpression' &&
            init.callee &&
            init.callee.type === 'Identifier' &&
            init.callee.name.endsWith('Store') &&
            init.callee.name.startsWith('use')
          ) {
            // Check if storeToRefs is already used
            if (
              init.callee.name === 'storeToRefs' ||
              (init.callee.type === 'MemberExpression' &&
                init.callee.property &&
                init.callee.property.name === 'storeToRefs')
            ) {
              return // Already using storeToRefs
            }

            // Warn and provide fix
            const sourceCode = context.sourceCode ?? (context as any).getSourceCode()
            const storeCallText = sourceCode.getText(init)

            context.report({
              node,
              messageId: 'preferStoreToRefs',
              data: { url: PINIA_DOCS },
              fix(fixer) {
                // Simple fix: wrap with storeToRefs
                // const { prop } = useStore() -> const { prop } = storeToRefs(useStore())
                return fixer.replaceText(init, `storeToRefs(${storeCallText})`)
              },
            })
          }

          // Check if RHS is a store variable: const { prop } = store
          // Only flag if variable name ends with 'Store' (Pinia convention)
          if (init.type === 'Identifier' && init.name.endsWith('Store')) {
            context.report({
              node,
              messageId: 'preferStoreToRefs',
              data: { url: PINIA_DOCS },
              fix(fixer: any) {
                // const { prop } = store -> const { prop } = storeToRefs(store)
                return fixer.replaceText(init, `storeToRefs(${init.name})`)
              },
            } as any)
          }
        }
      },
    }
  },
}
