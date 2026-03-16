import { defineTemplateBodyVisitor } from '../utils.mjs'

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow empty string values in USelect options (causes runtime error)',
      category: 'Possible Errors',
      recommended: true,
    },
    fixable: 'code',
    schema: [],
    messages: {
      noEmptyStringValue:
        'USelect options cannot have an empty string "" as a value. Use `undefined`, `null`, or a distinct value.',
    },
  },
  create(context) {
    /**
     * Checks if an object expression represents a select option with an empty string value.
     * Heuristic: Object has 'label' and 'value' properties, and 'value' is "".
     */
    function checkObjectExpression(node) {
      const properties = node.properties || []

      let hasLabel = false
      let valueProp = null

      for (const prop of properties) {
        if (prop.type !== 'Property' || prop.computed) continue

        const keyName = prop.key.name || prop.key.value

        if (keyName === 'label') {
          hasLabel = true
        } else if (keyName === 'value') {
          valueProp = prop
        }
      }

      if (
        hasLabel &&
        valueProp &&
        valueProp.value.type === 'Literal' &&
        valueProp.value.value === ''
      ) {
        context.report({
          node: valueProp.value,
          messageId: 'noEmptyStringValue',
          fix(fixer) {
            // Suggest replacing "" with undefined or null?
            // undefined is safer for "no selection" state in many cases
            return fixer.replaceText(valueProp.value, 'undefined')
          },
        })
      }
    }

    return defineTemplateBodyVisitor(
      context,
      // Template visitor
      {
        "VElement[name='USelect'] VAttribute[key.argument.name='items'] VExpressionContainer ArrayExpression ObjectExpression":
          checkObjectExpression,
      },
      // Script visitor
      {
        'ArrayExpression > ObjectExpression': checkObjectExpression,
      },
    )
  },
}
