/**
 * atx/no-native-kbd
 *
 * Disallow native <kbd> elements in Vue templates.
 * Use <UKbd> from Nuxt UI instead.
 */

import { defineTemplateBodyVisitor } from '../utils.mjs'

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow native <kbd> — use <UKbd>',
      category: 'ATX Design System',
    },
    messages: {
      noNativeKbd: 'Use <UKbd> instead of native <kbd>.',
    },
    schema: [],
  },

  create(context) {
    if (!context.filename.endsWith('.vue')) return {}

    return defineTemplateBodyVisitor(context, {
      'VElement[name="kbd"]'(node) {
        context.report({ node: node.startTag, messageId: 'noNativeKbd' })
      },
    })
  },
}
