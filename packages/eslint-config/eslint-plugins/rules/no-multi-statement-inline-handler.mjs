import { defineTemplateBodyVisitor } from '../utils.mjs'

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow multi-statement inline event handlers in Vue templates',
      category: 'ATX Design System',
    },
    messages: {
      noMultiStatement:
        'Avoid multi-statement inline event handlers. Extract the logic into a named function in the <script> block for better readability and to avoid template compiler errors.',
    },
    schema: [],
  },

  create(context) {
    if (!context.filename.endsWith('.vue')) return {}

    return defineTemplateBodyVisitor(context, {
      'VDirectiveKey[name.name="on"]'(node) {
        const attribute = node.parent
        if (
          attribute.value &&
          attribute.value.type === 'VExpressionContainer' &&
          attribute.value.expression
        ) {
          const expression = attribute.value.expression

          // Check if it's a SequenceExpression (e.g., a, b) or if there are multiple statements
          // vue-eslint-parser usually parses inline handlers as a list of statements if they are multiline or semicolon-separated
          if (expression.type === 'VOnExpression') {
            if (expression.body.length > 1) {
              context.report({
                node: attribute.value,
                messageId: 'noMultiStatement',
              })
            }
          }
        }
      },
    })
  },
}
