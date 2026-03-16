/**
 * Rule: nuxt-ui/no-deprecated-slot
 *
 * Error if using a slot name that is not in v4 spec or is deprecated.
 */

// Note: Using basic ESLint types for compatibility
import type { AST } from 'vue-eslint-parser'
import { normalizeComponentName, isNuxtUIComponent } from '../utils/component-utils'
import { getComponentSpec } from '../utils/spec-loader'
import type { PluginOptions } from '../types'

/**
 * Check if a slot name matches a dynamic pattern for components that support dynamic slots
 * UTable: #${columnId}-cell, #${columnId}-header, #${columnId}-data
 * UTabs: #${tabName} (any tab name)
 * UAvatar: #fallback (common slot)
 */
function isDynamicSlot(componentName: string, slotName: string): boolean {
  if (componentName === 'UTable') {
    // UTable supports dynamic slots: columnId-cell, columnId-header, columnId-data
    return /^[a-zA-Z0-9_-]+-(cell|header|data)$/.test(slotName)
  }
  if (componentName === 'UTabs') {
    // UTabs supports any tab name as a slot
    return true
  }
  if (componentName === 'UAvatar' && slotName === 'fallback') {
    // UAvatar supports fallback slot
    return true
  }
  return false
}

export interface RuleContext {
  options: [PluginOptions?]
  report: (_options: {
    node: AST.Node
    messageId: string
    data?: Record<string, string>
    fix?: (_fixer: {
      replaceText: (_node: AST.Node, _text: string) => unknown
      replaceTextRange: (_range: [number, number], _text: string) => unknown
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
      description: 'disallow deprecated slots on Nuxt UI components',
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
      deprecatedSlot: 'Slot "{{slotName}}" on {{componentName}} is deprecated. {{replacement}}',
      unknownSlot: 'Unknown slot "{{slotName}}" on {{componentName}}',
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

        const validSlots = new Set(spec.slots.map((s) => s.name))
        const deprecatedSlots = new Map<string, { replacedBy?: string }>()

        for (const slot of spec.slots) {
          if (slot.deprecated) {
            deprecatedSlots.set(slot.name, {
              replacedBy: slot.replacedBy,
            })
          }
        }

        // Check child elements for slot usage
        for (const child of vElement.children) {
          if (child.type === 'VElement') {
            const vElement = child as AST.VElement
            const slotAttr = vElement.startTag.attributes.find(
              (attr: AST.VAttribute | AST.VDirective) =>
                attr.type === 'VAttribute' && attr.key.name === 'slot',
            ) as AST.VAttribute | undefined

            if (slotAttr && slotAttr.value?.type === 'VLiteral') {
              const slotName = slotAttr.value.value as string

              // Check if deprecated
              const deprecated = deprecatedSlots.get(slotName)
              if (deprecated) {
                const replacement = deprecated.replacedBy
                  ? `Use "${deprecated.replacedBy}" instead`
                  : 'See https://ui.nuxt.com/docs/components/' +
                    normalizedName.toLowerCase().replace(/^u/, '')

                context.report({
                  node: slotAttr,
                  messageId: 'deprecatedSlot',
                  data: {
                    slotName,
                    componentName: normalizedName,
                    replacement,
                  },
                  fix: deprecated.replacedBy
                    ? (fixer) => {
                        return fixer.replaceText(slotAttr.value!, `"${deprecated.replacedBy}"`)
                      }
                    : undefined,
                })
              } else if (!validSlots.has(slotName) && slotName !== 'default') {
                // Allow dynamic slots for components that support them
                if (isDynamicSlot(normalizedName, slotName)) {
                  continue
                }
                context.report({
                  node: slotAttr,
                  messageId: 'unknownSlot',
                  data: {
                    slotName,
                    componentName: normalizedName,
                  },
                })
              }
            }
          }
        }

        // Check template slots (v-slot)
        for (const child of vElement.children) {
          if (child.type === 'VElement') {
            const vElement = child as AST.VElement
            if (vElement.name === 'template') {
              const slotAttr = vElement.startTag.attributes.find(
                (attr: AST.VAttribute | AST.VDirective) =>
                  attr.type === 'VAttribute' &&
                  attr.key.type === 'VDirectiveKey' &&
                  (attr.key.name.name === 'slot' || attr.key.name.name === ''),
              ) as AST.VAttribute | undefined

              if (slotAttr) {
                let slotName = 'default'
                if (slotAttr.key.type === 'VDirectiveKey' && slotAttr.key.argument) {
                  if (slotAttr.key.argument.type === 'VIdentifier') {
                    slotName = slotAttr.key.argument.name
                  } else if (slotAttr.key.argument.type === 'VExpressionContainer') {
                    // Dynamic slot - skip
                    continue
                  }
                }

                const deprecated = deprecatedSlots.get(slotName)
                if (deprecated) {
                  const replacement = deprecated.replacedBy
                    ? `Use "${deprecated.replacedBy}" instead`
                    : 'See https://ui.nuxt.com/docs/components/' +
                      normalizedName.toLowerCase().replace(/^u/, '')

                  context.report({
                    node: slotAttr,
                    messageId: 'deprecatedSlot',
                    data: {
                      slotName,
                      componentName: normalizedName,
                      replacement,
                    },
                    fix:
                      deprecated.replacedBy &&
                      slotAttr.key.type === 'VDirectiveKey' &&
                      slotAttr.key.argument &&
                      slotAttr.key.argument.range
                        ? (fixer) => {
                            return fixer.replaceTextRange(
                              (slotAttr.key as AST.VDirectiveKey).argument!.range!,
                              deprecated.replacedBy!,
                            )
                          }
                        : undefined,
                  })
                } else if (!validSlots.has(slotName) && slotName !== 'default') {
                  // Allow dynamic slots for components that support them
                  if (isDynamicSlot(normalizedName, slotName)) {
                    continue
                  }
                  context.report({
                    node: slotAttr,
                    messageId: 'unknownSlot',
                    data: {
                      slotName,
                      componentName: normalizedName,
                    },
                  })
                }
              }
            }
          }
        }
      },
    })
  },
}
