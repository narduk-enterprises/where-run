/**
 * Rule: nuxt-ui/require-valid-variant-values
 *
 * For props that have documented enums (e.g., size/color/variant), error on invalid literal values.
 */

// Note: Using basic ESLint types for compatibility
import type { AST } from 'vue-eslint-parser'
import {
  normalizeComponentName,
  normalizePropName,
  isNuxtUIComponent,
  getStaticStringValue,
} from '../utils/component-utils'
import { getComponentSpec } from '../utils/spec-loader'
import type { PluginOptions } from '../types'

export interface RuleContext {
  options: [PluginOptions?]
  report: (_options: { node: AST.Node; messageId: string; data?: Record<string, string> }) => void
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
      description: 'require valid variant values for Nuxt UI component props',
      category: 'Possible Errors',
      recommended: true,
    },
    fixable: undefined,
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
      invalidVariant:
        'Invalid value "{{value}}" for prop "{{propName}}" on {{componentName}}. Allowed values: {{allowedValues}}',
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

        // Build map of props with enum values
        const enumProps = new Map<string, string[]>()
        for (const prop of spec.props) {
          if (prop.enum && prop.enum.length > 0) {
            enumProps.set(prop.name.toLowerCase(), prop.enum)
            enumProps.set(normalizePropName(prop.name).toLowerCase(), prop.enum)
          }
        }

        // Check all attributes
        for (const attr of vElement.startTag.attributes) {
          if (attr.type !== 'VAttribute') continue

          const propName = attr.key.name
          if (typeof propName !== 'string') continue

          const normalizedProp = normalizePropName(propName).toLowerCase()
          const allowedValues = enumProps.get(normalizedProp)

          if (allowedValues && attr.value) {
            // Only check static string literals
            const staticValue = getStaticStringValue(attr.value)
            if (staticValue !== null) {
              if (!allowedValues.includes(staticValue)) {
                context.report({
                  node: attr.value,
                  messageId: 'invalidVariant',
                  data: {
                    value: staticValue,
                    propName,
                    componentName: normalizedName,
                    allowedValues: allowedValues.join(', '),
                  },
                })
              }
            }
          }
        }
      },
    })
  },
}
