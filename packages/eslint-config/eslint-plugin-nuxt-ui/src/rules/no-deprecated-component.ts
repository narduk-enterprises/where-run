/**
 * Rule: nuxt-ui/no-deprecated-component
 *
 * Disallow Nuxt UI v3 component names that were renamed in v4 (e.g. UDivider → USeparator).
 */

import type { AST } from 'vue-eslint-parser'
import { normalizeComponentName } from '../utils/component-utils'
import type { Rule } from 'eslint'

const DEPRECATED_COMPONENTS: Record<string, string> = {
  UDivider: 'USeparator',
  UDropdown: 'UDropdownMenu',
}

export default {
  meta: {
    type: 'problem' as const,
    docs: {
      description: 'disallow deprecated Nuxt UI component names (v3 → v4 renames)',
      category: 'Possible Errors',
      recommended: true,
    },
    fixable: 'code' as const,
    schema: [
      {
        type: 'object',
        properties: {
          prefixes: { type: 'array', items: { type: 'string' }, default: ['U'] },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      deprecatedComponent:
        'Component "{{name}}" is deprecated in Nuxt UI v4. Use "{{replacement}}" instead.',
    },
  },
  create(context: Rule.RuleContext<string, any[]>) {
    const options = context.options[0] || {}
    const prefixes = (options as { prefixes?: string[] }).prefixes || ['U']
    const parserServices = context.sourceCode?.parserServices ?? (context as any).parserServices
    if (!parserServices?.defineTemplateBodyVisitor) return {}

    return parserServices.defineTemplateBodyVisitor({
      VElement(node: AST.Node) {
        const vElement = node as AST.VElement
        const rawName = vElement.name
        const normalized = normalizeComponentName(rawName, prefixes)
        if (!normalized) return
        const replacement = DEPRECATED_COMPONENTS[normalized]
        if (!replacement) return

        const sourceCode = context.sourceCode ?? (context as any).getSourceCode()
        const startTag = vElement.startTag
        const endTag = vElement.endTag
        if (!startTag?.range) return

        const replaceName = rawName.includes('-')
          ? replacement
              .replace(/([A-Z])/g, '-$1')
              .slice(1)
              .toLowerCase()
          : replacement

        context.report({
          node: vElement,
          messageId: 'deprecatedComponent',
          data: { name: normalized, replacement },
          fix(fixer) {
            const fixes: ReturnType<typeof fixer.replaceTextRange>[] = []
            const startText = sourceCode.getText(startTag)
            const nameInStart = startText.slice(1).split(/[\s>]/)[0]
            if (nameInStart)
              fixes.push(
                fixer.replaceTextRange(
                  [startTag.range[0] + 1, startTag.range[0] + 1 + nameInStart.length],
                  replaceName,
                ),
              )
            if (endTag?.range) {
              const endText = sourceCode.getText(endTag)
              const nameInEnd = endText.slice(2, -1)
              if (nameInEnd)
                fixes.push(
                  fixer.replaceTextRange([endTag.range[0] + 2, endTag.range[1] - 1], replaceName),
                )
            }
            return fixes
          },
        })
      },
    })
  },
}
