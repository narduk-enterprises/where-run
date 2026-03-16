/**
 * atx/no-native-hr
 *
 * Disallow native <hr> elements in Vue templates.
 * Use <USeparator> from Nuxt UI instead.
 */

import { defineTemplateBodyVisitor } from '../utils.mjs'

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow native <hr> — use <USeparator>',
      category: 'ATX Design System',
    },
    messages: {
      noNativeHr: 'Use <USeparator> instead of native <hr>.',
    },
    schema: [],
  },

  create(context) {
    if (!context.filename.endsWith('.vue')) return {}

    return defineTemplateBodyVisitor(context, {
      'VElement[name="hr"]'(node) {
        context.report({ node: node.startTag, messageId: 'noNativeHr' })
      },
    })
  },
}
