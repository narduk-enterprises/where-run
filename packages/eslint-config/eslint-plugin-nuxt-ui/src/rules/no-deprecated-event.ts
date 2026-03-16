/**
 * Rule: nuxt-ui/no-deprecated-event
 *
 * Error if using @event that is not in v4 spec or is deprecated.
 */

// Note: Using basic ESLint types for compatibility
import type { AST } from 'vue-eslint-parser'
import { normalizeComponentName, isNuxtUIComponent } from '../utils/component-utils'
import { getComponentSpec } from '../utils/spec-loader'
import type { PluginOptions } from '../types'

/**
 * Standard DOM events that should be allowed on all components
 * These are native browser events that Vue components should accept
 */
const STANDARD_DOM_EVENTS = new Set([
  'click',
  'dblclick',
  'mousedown',
  'mouseup',
  'mousemove',
  'mouseenter',
  'mouseleave',
  'mouseover',
  'mouseout',
  'focus',
  'blur',
  'input',
  'change',
  'submit',
  'keydown',
  'keyup',
  'keypress',
  'scroll',
  'resize',
  'load',
  'unload',
  'error',
  'contextmenu',
  'drag',
  'dragstart',
  'dragend',
  'dragover',
  'dragenter',
  'dragleave',
  'drop',
  'touchstart',
  'touchend',
  'touchmove',
  'touchcancel',
  'close', // Common modal/popover close event
  'open', // Common modal/popover open event
])

export interface RuleContext {
  options: [PluginOptions?]
  report: (_options: {
    node: AST.Node
    messageId: string
    data?: Record<string, string>
    fix?: (_fixer: {
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
      description: 'disallow deprecated events on Nuxt UI components',
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
      deprecatedEvent: 'Event "@{{eventName}}" on {{componentName}} is deprecated. {{replacement}}',
      unknownEvent: 'Unknown event "@{{eventName}}" on {{componentName}}',
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

        const validEvents = new Set(spec.events.map((e) => e.name))
        const deprecatedEvents = new Map<string, { replacedBy?: string }>()

        for (const event of spec.events) {
          if (event.deprecated) {
            deprecatedEvents.set(event.name, {
              replacedBy: event.replacedBy,
            })
          }
        }

        // Check all attributes for event handlers
        for (const attr of vElement.startTag.attributes) {
          if (attr.type !== 'VAttribute' && attr.type !== 'VDirective') continue

          if (attr.key.type === 'VDirectiveKey' && attr.key.name.name === 'on') {
            const eventName = attr.key.argument
            if (eventName && eventName.type === 'VIdentifier') {
              const eventNameStr = eventName.name

              // Check if deprecated FIRST so we report specifically deprecated DOM events too (like @change)
              const deprecated = deprecatedEvents.get(eventNameStr)
              if (deprecated) {
                const replacement = deprecated.replacedBy
                  ? `Use "@${deprecated.replacedBy}" instead`
                  : 'See https://ui.nuxt.com/docs/components/' +
                    normalizedName.toLowerCase().replace(/^u/, '')

                context.report({
                  node: attr,
                  messageId: 'deprecatedEvent',
                  data: {
                    eventName: eventNameStr,
                    componentName: normalizedName,
                    replacement,
                  },
                  fix:
                    deprecated.replacedBy && eventName.range
                      ? (fixer) => {
                          return fixer.replaceTextRange(eventName.range!, deprecated.replacedBy!)
                        }
                      : undefined,
                })
                continue
              }

              // Allow standard DOM events (click, input, change, etc.)
              if (STANDARD_DOM_EVENTS.has(eventNameStr.toLowerCase())) {
                continue
              }

              // Allow v-model update events (@update:propName)
              // When using v-model:open, Vue emits @update:open events
              if (eventNameStr.startsWith('update:')) {
                continue
              }

              if (!validEvents.has(eventNameStr)) {
                context.report({
                  node: attr,
                  messageId: 'unknownEvent',
                  data: {
                    eventName: eventNameStr,
                    componentName: normalizedName,
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
