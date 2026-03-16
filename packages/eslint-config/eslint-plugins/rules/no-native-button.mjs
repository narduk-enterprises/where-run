/**
 * atx/no-native-button
 *
 * Disallow native <button> elements in Vue templates.
 * Use <UButton> from Nuxt UI instead.
 */

import { defineTemplateBodyVisitor } from '../utils.mjs'

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow native <button> — use <UButton> from Nuxt UI',
      category: 'ATX Design System',
    },
    messages: {
      noNativeButton: 'Use <UButton> instead of native <button>.',
    },
    schema: [],
  },

  create(context) {
    if (!context.filename.endsWith('.vue')) return {}

    return defineTemplateBodyVisitor(context, {
      'VElement[name="button"]'(node) {
        context.report({ node: node.startTag, messageId: 'noNativeButton' })
      },
    })
  },
}
