/**
 * atx/no-attrs-on-fragment
 *
 * Detects Vue SFC templates that Vue cannot automatically inherit attributes
 * onto. This happens when a component renders:
 *   - Multiple root elements (fragment)
 *   - A root-level <Teleport>
 *   - Only non-whitespace text at the root
 *
 * When a parent passes `style` or `class` to such a component, Vue emits:
 *   "[Vue warn]: Extraneous non-props attributes (style) were passed to
 *    component but could not be automatically inherited because component
 *    renders fragment or text or teleport root nodes."
 *
 * Fix options:
 *   1. Wrap template content in a single root element.
 *   2. Add `defineOptions({ inheritAttrs: false })` and manually bind
 *      `$attrs` where needed.
 */

import { defineTemplateBodyVisitor } from '../utils.mjs'

/**
 * Tag names that Vue treats as non-inheritable root nodes.
 * These cannot receive fallthrough attributes even when used alone.
 */
const UNINHERITABLE_ROOT_TAGS = new Set(['teleport', 'Teleport', 'template'])

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow multi-root (fragment) templates and teleport/text-only roots without inheritAttrs: false',
      category: 'ATX Design System',
    },
    messages: {
      fragmentNeedsInheritAttrs:
        'This component has {{ count }} root elements (fragment template) but does not set `inheritAttrs: false`. ' +
        'If a parent passes style/class, Vue will emit a runtime warning. ' +
        'Either wrap in a single root element or add `defineOptions({ inheritAttrs: false })`.',
      teleportRootNeedsInheritAttrs:
        'Root-level <{{ tag }}> cannot inherit fallthrough attributes (style/class). ' +
        'Wrap it in a plain element or add `defineOptions({ inheritAttrs: false })`.',
      textOnlyRootNeedsInheritAttrs:
        'This component renders only text at the root, which cannot inherit fallthrough attributes. ' +
        'Wrap the text in a single root element or add `defineOptions({ inheritAttrs: false })`.',
    },
    schema: [],
  },

  create(context) {
    if (!context.filename.endsWith('.vue')) return {}

    // Track whether inheritAttrs: false was declared in <script setup> or <script>
    let hasInheritAttrsFalse = false

    const scriptVisitor = {
      // Match: defineOptions({ inheritAttrs: false })
      'CallExpression[callee.name="defineOptions"]'(node) {
        const arg = node.arguments[0]
        if (arg && arg.type === 'ObjectExpression') {
          for (const prop of arg.properties) {
            if (
              prop.type === 'Property' &&
              prop.key.type === 'Identifier' &&
              prop.key.name === 'inheritAttrs' &&
              prop.value.type === 'Literal' &&
              prop.value.value === false
            ) {
              hasInheritAttrsFalse = true
            }
          }
        }
      },

      // Match: export default { inheritAttrs: false }
      'ExportDefaultDeclaration > ObjectExpression > Property[key.name="inheritAttrs"]'(node) {
        if (node.value.type === 'Literal' && node.value.value === false) {
          hasInheritAttrsFalse = true
        }
      },
    }

    return defineTemplateBodyVisitor(
      context,
      {
        // Fires once for the template root — check children
        'VElement[name="template"]'(node) {
          // Only process the top-level <template> (document root)
          if (node.parent && node.parent.type !== 'VDocumentFragment') return

          // Collect significant root children (elements + non-whitespace text)
          const rootChildren = node.children.filter(
            (child) =>
              child.type === 'VElement' ||
              (child.type === 'VText' && child.value.trim().length > 0),
          )

          if (hasInheritAttrsFalse) return

          // Case 1: Multiple root nodes → fragment
          if (rootChildren.length > 1) {
            context.report({
              node: node.startTag || node,
              messageId: 'fragmentNeedsInheritAttrs',
              data: { count: String(rootChildren.length) },
            })
            return
          }

          // Case 2: Single root is <Teleport> or <template> (non-inheritable)
          if (rootChildren.length === 1 && rootChildren[0].type === 'VElement') {
            const tag = rootChildren[0].rawName || rootChildren[0].name
            if (UNINHERITABLE_ROOT_TAGS.has(tag)) {
              context.report({
                node: rootChildren[0].startTag || rootChildren[0],
                messageId: 'teleportRootNeedsInheritAttrs',
                data: { tag },
              })
              return
            }
          }

          // Case 3: Only text nodes at root (no elements)
          if (rootChildren.length > 0 && rootChildren.every((c) => c.type === 'VText')) {
            context.report({
              node: node.startTag || node,
              messageId: 'textOnlyRootNeedsInheritAttrs',
            })
          }
        },
      },
      scriptVisitor,
    )
  },
}
