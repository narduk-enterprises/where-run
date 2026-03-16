/**
 * atx/no-inline-svg
 *
 * Disallow inline <svg> elements in Vue templates.
 * Use <UIcon name="i-lucide-*"> from Nuxt UI instead.
 */

import { defineTemplateBodyVisitor } from '../utils.mjs'

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow inline <svg> — use <UIcon> with Lucide icons',
      category: 'ATX Design System',
    },
    messages: {
      noInlineSvg: 'Use <UIcon name="i-lucide-*"> instead of inline <svg>.',
    },
    schema: [],
  },

  create(context) {
    if (!context.filename.endsWith('.vue')) return {}

    return defineTemplateBodyVisitor(context, {
      'VElement[name="svg"]'(node) {
        context.report({ node: node.startTag, messageId: 'noInlineSvg' })
      },
    })
  },
}
