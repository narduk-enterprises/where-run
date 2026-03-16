/**
 * atx/no-native-table
 *
 * Disallow native <table> elements in Vue templates.
 * Use <UTable> from Nuxt UI instead.
 */

import { defineTemplateBodyVisitor } from '../utils.mjs'

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow native <table> — use <UTable> from Nuxt UI',
      category: 'ATX Design System',
    },
    messages: {
      noNativeTable: 'Use <UTable> instead of native <table>.',
    },
    schema: [],
  },

  create(context) {
    if (!context.filename.endsWith('.vue')) return {}

    return defineTemplateBodyVisitor(context, {
      'VElement[name="table"]'(node) {
        context.report({ node: node.startTag, messageId: 'noNativeTable' })
      },
    })
  },
}
