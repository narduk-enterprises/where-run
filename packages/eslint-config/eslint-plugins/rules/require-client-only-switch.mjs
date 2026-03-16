/**
 * atx/require-client-only-switch
 *
 * Require <USwitch> to be wrapped in <ClientOnly> to prevent
 * hydration mismatches in SSR.
 */

import { defineTemplateBodyVisitor } from '../utils.mjs'

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require <USwitch> to be wrapped in <ClientOnly>',
      category: 'ATX Design System',
    },
    messages: {
      requireClientOnly:
        '<USwitch> must be wrapped in <ClientOnly> to avoid hydration mismatch. Add <ClientOnly> around it with a #fallback slot.',
    },
    schema: [],
  },

  create(context) {
    if (!context.filename.endsWith('.vue')) return {}

    return defineTemplateBodyVisitor(context, {
      'VElement[name="USwitch"], VElement[name="u-switch"]'(node) {
        // Walk up the tree looking for a ClientOnly ancestor
        let parent = node.parent
        while (parent) {
          if (
            parent.type === 'VElement' &&
            (parent.name === 'ClientOnly' || parent.name === 'client-only')
          ) {
            return // Found — all good
          }
          parent = parent.parent
        }

        context.report({
          node: node.startTag,
          messageId: 'requireClientOnly',
        })
      },
    })
  },
}
