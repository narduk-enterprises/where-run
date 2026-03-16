/**
 * Rule: nuxt-ui/no-unknown-component-prop
 *
 * Error if a Nuxt UI component is used with a prop/attribute that does not exist in v4 spec.
 */

// Note: Using basic ESLint types since @typescript-eslint/utils may not be available
// This is compatible with ESLint 9 flat config
import type { AST } from 'vue-eslint-parser'
import {
  normalizeComponentName,
  normalizePropName,
  isNuxtUIComponent,
} from '../utils/component-utils'
import { getComponentSpec } from '../utils/spec-loader'
import type { PluginOptions } from '../types'

/**
 * Standard HTML attributes that should be allowed on all components
 */
const STANDARD_HTML_ATTRIBUTES = new Set([
  'class',
  'id',
  'style',
  'key',
  'ref',
  'is',
  'v-is',
  'title',
])

/**
 * Check if an attribute name is a standard HTML attribute (including aria-* and data-*)
 */
function isStandardHTMLAttribute(name: string): boolean {
  // Standard HTML attributes
  if (STANDARD_HTML_ATTRIBUTES.has(name.toLowerCase())) {
    return true
  }
  // ARIA attributes (aria-*)
  if (name.toLowerCase().startsWith('aria-')) {
    return true
  }
  // Data attributes (data-*)
  if (name.toLowerCase().startsWith('data-')) {
    return true
  }
  return false
}

/**
 * Standard HTML form input attributes that should be allowed on input-like components
 */
const STANDARD_INPUT_ATTRIBUTES = new Set([
  'min',
  'max',
  'step',
  'inputmode',
  'maxlength',
  'value',
  'placeholder',
  'autocomplete',
  'autofocus',
  'required',
  'readonly',
  'pattern',
  'list',
  'multiple',
  'accept',
  'capture',
  'dirname',
  'form',
  'formaction',
  'formenctype',
  'formmethod',
  'formnovalidate',
  'formtarget',
  'height',
  'width',
  'size',
])

/**
 * Standard HTML button attributes
 */
const STANDARD_BUTTON_ATTRIBUTES = new Set([
  'type', // button, submit, reset
  'form',
  'formaction',
  'formenctype',
  'formmethod',
  'formnovalidate',
  'formtarget',
])

/**
 * Component-specific prop whitelist for common inherited props
 * These props are inherited from base components (like NuxtLink) and should be allowed
 * Also includes props that are commonly used but may not be in the spec
 */
const COMPONENT_INHERITED_PROPS: Record<string, Set<string>> = {
  UButton: new Set([
    'to',
    'loading',
    'disabled',
    'href',
    'target',
    'rel',
    'download',
    'icon',
    'trailing-icon',
    'trailingIcon', // Common Nuxt UI prop
  ]),
  UInput: new Set([
    'icon',
    'loading', // Common Nuxt UI props
  ]),
  UModal: new Set([
    'ui', // UI customization prop
    'open', // v-model:open support
  ]),
  UPopover: new Set(['open']), // v-model:open support
  USlideover: new Set(['open']), // v-model:open support
  UTooltip: new Set(['popper']), // Popper.js configuration
  USelect: new Set([
    'options',
    'disabled',
    'searchable', // Common select props
  ]),
  USwitch: new Set([
    'disabled',
    'model-value', // v-model support
  ]),
  UCheckbox: new Set(['disabled']),
  UProgress: new Set(['model-value']), // v-model support
  UPagination: new Set([
    'page',
    'total',
    'items-per-page',
    'itemsPerPage',
    'sibling-count',
    'siblingCount',
    'show-edges',
    'showEdges',
  ]),
  UTable: new Set([
    'loading',
    'sorting', // Common table props
  ]),
  UAlert: new Set([
    'size',
    'actions', // Common alert props
  ]),
  UBadge: new Set([
    'icon',
    'title', // Common badge props
  ]),
}

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
      description: 'disallow unknown props on Nuxt UI components',
      category: 'Possible Errors',
      recommended: true,
    },
    fixable: undefined,
    // Require vue-eslint-parser for Vue files
    requiresTypeChecking: false,
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
      unknownProp:
        'Unknown prop "{{propName}}" on {{componentName}}. See https://ui.nuxt.com/docs/components/{{componentSlug}}',
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

        // Skip template element itself
        if (componentName === 'template') {
          return
        }

        if (!isNuxtUIComponent(componentName, prefixes, allowedComponents)) {
          return
        }

        const normalizedName = normalizeComponentName(componentName, prefixes)
        if (!normalizedName) {
          return
        }

        const spec = getComponentSpec(normalizedName, options.specPath)
        if (!spec) {
          return
        }

        const validProps = new Set(spec.props.map((p) => p.name.toLowerCase()))
        const validPropsCamel = new Set(
          spec.props.map((p) => normalizePropName(p.name).toLowerCase()),
        )

        // Check all attributes
        for (const attr of vElement.startTag.attributes) {
          if (attr.type !== 'VAttribute') {
            continue
          }

          let propName: string | null = null

          // Handle different attribute types
          if (attr.key.type === 'VIdentifier') {
            // Regular attribute: prop-name="value"
            propName = attr.key.name
          } else if (attr.key.type === 'VDirectiveKey') {
            // Directive: :prop-name, v-model:prop-name, @event-name
            const directiveKey = attr.key as AST.VDirectiveKey

            // Handle v-bind:prop-name or :prop-name (shorthand)
            if (directiveKey.name.name === 'bind' || directiveKey.name.name === 'model') {
              const argument = directiveKey.argument
              if (argument && argument.type === 'VIdentifier') {
                propName = argument.name
              } else if (argument && argument.type === 'VExpressionContainer') {
                // Dynamic prop name (e.g., :[propName]) - skip
                continue
              } else if (!argument && directiveKey.name.name === 'bind') {
                // v-bind without argument (binds all props) - skip
                continue
              } else {
                // v-model without argument - skip (not a prop)
                continue
              }
            } else {
              // Skip other directives (@click, v-if, v-for, etc.)
              continue
            }
          } else {
            continue
          }

          if (!propName || typeof propName !== 'string') {
            continue
          }

          // Allow standard HTML attributes (class, id, style, aria-*, data-*)
          if (isStandardHTMLAttribute(propName)) {
            continue
          }

          // Allow standard HTML input attributes on input-like components
          if (
            normalizedName === 'UInput' &&
            STANDARD_INPUT_ATTRIBUTES.has(propName.toLowerCase())
          ) {
            continue
          }

          // Allow standard HTML button attributes on button components
          if (
            normalizedName === 'UButton' &&
            STANDARD_BUTTON_ATTRIBUTES.has(propName.toLowerCase())
          ) {
            continue
          }

          // Check component-specific inherited props (e.g., UButton inherits 'to' from NuxtLink)
          const inheritedProps = COMPONENT_INHERITED_PROPS[normalizedName]
          if (inheritedProps) {
            const propNameLower = propName.toLowerCase()
            // Check both kebab-case and camelCase versions
            if (inheritedProps.has(propNameLower) || inheritedProps.has(propName)) {
              continue
            }
            // Also check normalized camelCase version
            const normalizedProp = normalizePropName(propName)
            if (
              inheritedProps.has(normalizedProp) ||
              inheritedProps.has(normalizedProp.toLowerCase())
            ) {
              continue
            }
          }

          // Normalize kebab-case to camelCase for comparison
          const normalizedProp = normalizePropName(propName).toLowerCase()
          const propNameLower = propName.toLowerCase()

          // Check if prop exists (check both original and normalized forms)
          // Also check kebab-case version
          const propNameKebab = propName.includes('-') ? propName.toLowerCase() : null
          const isValid =
            validProps.has(propNameLower) ||
            validPropsCamel.has(normalizedProp) ||
            (propNameKebab && validProps.has(propNameKebab))

          if (!isValid) {
            const componentSlug = normalizedName.toLowerCase().replace(/^u/, '')
            context.report({
              node: attr,
              messageId: 'unknownProp',
              data: {
                propName,
                componentName: normalizedName,
                componentSlug,
              },
            })
          }
        }
      },
    })
  },
}
