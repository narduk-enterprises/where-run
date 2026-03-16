/**
 * Rule: nuxt-ui/no-deprecated-prop
 *
 * Error if an attribute/prop is known to be deprecated/renamed; provide autofix when a mechanical rename exists.
 */

// Note: Using basic ESLint types for compatibility
import type { AST } from 'vue-eslint-parser'
import {
  normalizeComponentName,
  normalizePropName,
  isNuxtUIComponent,
} from '../utils/component-utils'
import { getComponentSpec } from '../utils/spec-loader'
import type { PluginOptions } from '../types'

export interface RuleContext {
  options: [PluginOptions?]
  report: (_options: {
    node: AST.Node
    messageId: string
    data?: Record<string, string>
    fix?: (_fixer: {
      replaceTextRange: (_range: [number, number], _text: string) => unknown
      replaceText: (_node: any, _text: string) => unknown
    }) => unknown
  }) => void
  getSourceCode: () => { getText: (_node?: AST.Node) => string }
  sourceCode: {
    parserServices?: {
      defineTemplateBodyVisitor: (
        visitor: Record<string, (node: AST.Node) => void>,
        scriptVisitor?: Record<string, (node: AST.Node) => void>,
      ) => Record<string, (node: AST.Node) => void>
    }
  }
}

export default {
  meta: {
    type: 'problem' as const,
    docs: {
      description: 'disallow deprecated props on Nuxt UI components',
      category: 'Possible Errors',
      recommended: true,
    },
    fixable: 'code' as const,
    schema: [
      {
        type: 'object',
        properties: {
          prefixes: {
            type: 'array',
            items: { type: 'string' },
            default: ['U'],
          },
          components: {
            type: 'array',
            items: { type: 'string' },
          },
          specPath: {
            type: 'string',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      deprecatedProp: 'Prop "{{propName}}" on {{componentName}} is deprecated. {{replacement}}',
    },
  },
  create(context: RuleContext) {
    const options = context.options[0] || {}
    const prefixes = options.prefixes || ['U']
    const allowedComponents = options.components

    // Use defineTemplateBodyVisitor for Vue template AST nodes
    // Access via sourceCode.parserServices (not context.parserServices)
    const parserServices = context.sourceCode?.parserServices

    if (!parserServices || !parserServices.defineTemplateBodyVisitor) {
      // Fallback for non-Vue files or if parser services aren't available
      return {}
    }

    return parserServices.defineTemplateBodyVisitor({
      VElement(node: AST.Node) {
        const vElement = node as AST.VElement
        const componentName = vElement.name
        if (!isNuxtUIComponent(componentName, prefixes, allowedComponents)) {
          return
        }

        const normalizedName = normalizeComponentName(componentName, prefixes)
        if (!normalizedName) return

        const spec = getComponentSpec(normalizedName, options.specPath)
        if (!spec) return

        // Build map of deprecated props
        const deprecatedProps = new Map<string, { replacedBy?: string }>()
        for (const prop of spec.props) {
          if (prop.deprecated) {
            deprecatedProps.set(prop.name.toLowerCase(), {
              replacedBy: prop.replacedBy,
            })
            deprecatedProps.set(normalizePropName(prop.name).toLowerCase(), {
              replacedBy: prop.replacedBy,
            })
          }
        }

        // Check all attributes
        for (const attr of vElement.startTag.attributes) {
          if (attr.type !== 'VAttribute') continue

          const propName = attr.key.name
          if (typeof propName !== 'string') continue

          const normalizedProp = normalizePropName(propName).toLowerCase()
          const deprecated = deprecatedProps.get(normalizedProp)

          if (deprecated) {
            const replacement = deprecated.replacedBy
              ? `Use "${deprecated.replacedBy}" instead`
              : 'See https://ui.nuxt.com/docs/components/' +
                normalizedName.toLowerCase().replace(/^u/, '')

            context.report({
              node: attr,
              messageId: 'deprecatedProp',
              data: {
                propName,
                componentName: normalizedName,
                replacement,
              },
              fix:
                deprecated.replacedBy && attr.key.range
                  ? (fixer) => {
                      if (deprecated.replacedBy!.includes('=')) {
                        return fixer.replaceText(attr, deprecated.replacedBy!)
                      }
                      return fixer.replaceTextRange(attr.key.range!, deprecated.replacedBy!)
                    }
                  : undefined,
            })
          }
        }
      },
    })
  },
}
