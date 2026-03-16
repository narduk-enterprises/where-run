/**
 * atx/no-native-input
 *
 * Disallow native <input>, <textarea>, and <select> elements in Vue templates.
 * Use Nuxt UI equivalents: <UInput>, <UTextarea>, <USelect>.
 */

import { defineTemplateBodyVisitor } from '../utils.mjs'

const elementMap = {
  input: 'UInput (or UInputNumber/UInputDate for specific types)',
  textarea: 'UTextarea',
  select: 'USelect (or USelectMenu for searchable)',
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow native <input>/<textarea>/<select> — use Nuxt UI form components',
      category: 'ATX Design System',
    },
    messages: {
      noNativeInput: 'Use <{{ replacement }}> instead of native <{{ element }}>.',
    },
    schema: [],
  },

  create(context) {
    if (!context.filename.endsWith('.vue')) return {}

    return defineTemplateBodyVisitor(context, {
      'VElement[name="input"], VElement[name="textarea"], VElement[name="select"]'(node) {
        const el = node.name
        context.report({
          node: node.startTag,
          messageId: 'noNativeInput',
          data: { element: el, replacement: elementMap[el] },
        })
      },
    })
  },
}
