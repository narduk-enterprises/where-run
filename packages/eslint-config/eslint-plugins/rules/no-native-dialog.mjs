/**
 * atx/no-native-dialog
 *
 * Disallow native <dialog> elements in Vue templates.
 * Use <UModal>, <UDrawer>, or <USlideover> from Nuxt UI instead.
 */

import { defineTemplateBodyVisitor } from '../utils.mjs'

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow native <dialog> — use <UModal>, <UDrawer>, or <USlideover>',
      category: 'ATX Design System',
    },
    messages: {
      noNativeDialog: 'Use <UModal>, <UDrawer>, or <USlideover> instead of native <dialog>.',
    },
    schema: [],
  },

  create(context) {
    if (!context.filename.endsWith('.vue')) return {}

    return defineTemplateBodyVisitor(context, {
      'VElement[name="dialog"]'(node) {
        context.report({ node: node.startTag, messageId: 'noNativeDialog' })
      },
    })
  },
}
