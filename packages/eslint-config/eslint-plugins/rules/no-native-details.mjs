/**
 * atx/no-native-details
 *
 * Disallow native <details> and <summary> elements in Vue templates.
 * Use <UAccordion> or <UCollapsible> from Nuxt UI instead.
 */

import { defineTemplateBodyVisitor } from '../utils.mjs'

const elementMap = {
  details: '<UAccordion> or <UCollapsible>',
  summary: '<UAccordion> or <UCollapsible>',
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow native <details>/<summary> — use <UAccordion> or <UCollapsible>',
      category: 'ATX Design System',
    },
    messages: {
      noNativeDetails: 'Use {{ replacement }} instead of native <{{ element }}>.',
    },
    schema: [],
  },

  create(context) {
    if (!context.filename.endsWith('.vue')) return {}

    return defineTemplateBodyVisitor(context, {
      'VElement[name="details"], VElement[name="summary"]'(node) {
        const el = node.name
        context.report({
          node: node.startTag,
          messageId: 'noNativeDetails',
          data: { element: el, replacement: elementMap[el] },
        })
      },
    })
  },
}
