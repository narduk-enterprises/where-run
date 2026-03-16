/**
 * Rule: vue-official/require-script-setup
 *
 * Warns when Options API is used instead of <script setup>
 */

import type { RuleContext, RuleListener } from 'eslint'
import { VUE_STYLE_GUIDE } from '../utils/vue-docs-urls'

export default {
  meta: {
    type: 'suggestion' as const,
    docs: {
      description: 'prefer <script setup> over Options API',
      category: 'Best Practices',
      recommended: true,
      url: VUE_STYLE_GUIDE,
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowOptionsApi: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      preferScriptSetup: 'Prefer <script setup> over Options API. See: {{url}}',
    },
  },
  create(context: RuleContext<string, any[]>): RuleListener {
    const parserServices = (context.sourceCode?.parserServices ?? context.parserServices) as any
    const options = context.options[0] || {}
    const allowOptionsApi = options.allowOptionsApi !== false // Default: true

    if (!parserServices || !parserServices.defineTemplateBodyVisitor) {
      return {}
    }

    return parserServices.defineTemplateBodyVisitor(
      {},
      {
        // Check for export default with component options
        ExportDefaultDeclaration(node: any) {
          if (allowOptionsApi) {
            return
          }

          // Check if it's a component definition (has properties like data, methods, etc.)
          if (node.declaration && node.declaration.type === 'ObjectExpression') {
            const hasComponentOptions = node.declaration.properties.some((prop: any) => {
              const key = prop.key?.name || prop.key?.value
              return [
                'data',
                'methods',
                'computed',
                'watch',
                'props',
                'emits',
                'setup', // Options API can have setup too
              ].includes(key)
            })

            if (hasComponentOptions) {
              context.report({
                node,
                messageId: 'preferScriptSetup',
                data: { url: VUE_STYLE_GUIDE },
              })
            }
          }
        },
      },
    )
  },
}
