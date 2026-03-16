/**
 * atx/require-validated-query
 *
 * Flags calls to getQuery(event) in server API routes that are NOT
 * followed by a Zod .parse() or .safeParse() call on the result
 * within the same function body.
 *
 * Rationale: all API query params must be validated with Zod schemas.
 * Manual Number() / string coercion is fragile and inconsistent.
 */

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require Zod validation after getQuery() — use .parse() or .safeParse()',
      category: 'ATX Server Safety',
    },
    messages: {
      requireValidation:
        'getQuery() result must be validated with Zod .parse() or .safeParse(). See radar/keywords.get.ts for the pattern.',
    },
    schema: [],
  },

  create(context) {
    // Only run on server API files
    if (!context.filename.includes('/server/')) return {}

    // Track variable names assigned from getQuery()
    const getQueryVars = new Map()
    // Track variables that have been validated
    const validatedVars = new Set()
    // Track inline getQuery().prop usage (no variable assignment)
    const inlineGetQueryNodes = []

    return {
      // Match: const query = getQuery(event)
      VariableDeclarator(node) {
        const init = node.init
        if (!init) return

        // Unwrap await (though getQuery is sync)
        const call = init.type === 'AwaitExpression' ? init.argument : init

        if (
          call &&
          call.type === 'CallExpression' &&
          call.callee.type === 'Identifier' &&
          call.callee.name === 'getQuery' &&
          node.id.type === 'Identifier'
        ) {
          getQueryVars.set(node.id.name, node)
        }
      },

      // Match: schema.parse(query) or schema.safeParse(query)
      'CallExpression[callee.type="MemberExpression"]'(node) {
        const prop = node.callee.property
        if (
          prop &&
          (prop.name === 'parse' || prop.name === 'safeParse') &&
          node.arguments.length > 0
        ) {
          const arg = node.arguments[0]
          if (arg.type === 'Identifier') {
            validatedVars.add(arg.name)
          }
          // Also handle: schema.parse(getQuery(event))
          if (
            arg.type === 'CallExpression' &&
            arg.callee.type === 'Identifier' &&
            arg.callee.name === 'getQuery'
          ) {
            validatedVars.add('__inline_getQuery__')
          }
        }
      },

      // Match inline: Number(getQuery(event).limit)
      'CallExpression[callee.name="getQuery"]'(node) {
        // Check if this getQuery call is an argument to .parse() / .safeParse()
        // If not assigned to a variable, track it for end-of-program check
        const parent = node.parent
        if (parent && parent.type === 'VariableDeclarator') return // handled above
        // Check if it's inside a .parse() call
        if (
          parent &&
          parent.type === 'CallExpression' &&
          parent.callee.type === 'MemberExpression' &&
          (parent.callee.property.name === 'parse' || parent.callee.property.name === 'safeParse')
        ) {
          return // valid — inline validated
        }
        inlineGetQueryNodes.push(node)
      },

      // At the end, report unvalidated getQuery vars
      'Program:exit'() {
        for (const [varName, node] of getQueryVars) {
          if (!validatedVars.has(varName)) {
            context.report({
              node: node.init.type === 'AwaitExpression' ? node.init.argument : node.init,
              messageId: 'requireValidation',
            })
          }
        }
        // Report inline getQuery usage (e.g. Number(getQuery(event).limit))
        for (const node of inlineGetQueryNodes) {
          context.report({ node, messageId: 'requireValidation' })
        }
      },
    }
  },
}
