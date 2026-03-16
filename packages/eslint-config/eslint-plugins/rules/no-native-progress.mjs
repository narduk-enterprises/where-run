/**
 * atx/no-native-progress
 *
 * Disallow native <progress> elements in Vue templates.
 * Use <UProgress> from Nuxt UI instead.
 */

import { defineTemplateBodyVisitor } from '../utils.mjs'

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow native <progress> — use <UProgress>',
      category: 'ATX Design System',
    },
    messages: {
      noNativeProgress: 'Use <UProgress> instead of native <progress>.',
    },
    schema: [],
  },

  create(context) {
    if (!context.filename.endsWith('.vue')) return {}

    return defineTemplateBodyVisitor(context, {
      'VElement[name="progress"]'(node) {
        context.report({ node: node.startTag, messageId: 'noNativeProgress' })
      },
    })
  },
}
