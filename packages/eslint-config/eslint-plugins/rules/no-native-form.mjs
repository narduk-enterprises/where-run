/**
 * atx/no-native-form
 *
 * Disallow native <form> and <label> elements in Vue templates.
 * Use <UForm> and <UFormField> from Nuxt UI instead.
 */

import { defineTemplateBodyVisitor } from '../utils.mjs'

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow native <form>/<label> — use <UForm>/<UFormField>',
      category: 'ATX Design System',
    },
    messages: {
      noNativeForm: 'Use <UForm> instead of native <form>.',
      noNativeLabel: 'Use <UFormField> instead of native <label>.',
    },
    schema: [],
  },

  create(context) {
    if (!context.filename.endsWith('.vue')) return {}

    return defineTemplateBodyVisitor(context, {
      'VElement[name="form"]'(node) {
        context.report({ node: node.startTag, messageId: 'noNativeForm' })
      },
      'VElement[name="label"]'(node) {
        context.report({ node: node.startTag, messageId: 'noNativeLabel' })
      },
    })
  },
}
