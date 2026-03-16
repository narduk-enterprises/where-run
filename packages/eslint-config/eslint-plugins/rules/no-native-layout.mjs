/**
 * atx/no-native-layout
 *
 * Disallow native layout elements (<header>, <footer>, <main>, <nav>)
 * in Vue templates when used at the page/app level.
 *
 * Suggests Nuxt UI layout primitives or semantic alternatives.
 */

import { defineTemplateBodyVisitor } from '../utils.mjs'

const elementSuggestions = {
  header: '<UHeader> or <div>',
  footer: '<UFooter> or <div>',
  main: '<UMain> or <div>',
  nav: '<UNavigationMenu> or <div>',
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow native layout elements — use Nuxt UI equivalents',
      category: 'ATX Design System',
    },
    messages: {
      noNativeLayout: 'Consider using {{ suggestion }} instead of native <{{ element }}>.',
    },
    schema: [],
  },

  create(context) {
    if (!context.filename.endsWith('.vue')) return {}

    return defineTemplateBodyVisitor(context, {
      'VElement[name="header"], VElement[name="footer"], VElement[name="main"], VElement[name="nav"]'(
        node,
      ) {
        const el = node.name
        context.report({
          node: node.startTag,
          messageId: 'noNativeLayout',
          data: { element: el, suggestion: elementSuggestions[el] },
        })
      },
    })
  },
}
