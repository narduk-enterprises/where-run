/**
 * atx/require-validated-body
 *
 * Flags calls to readBody(event) in server API routes that are NOT
 * followed by a Zod .parse() or .safeParse() call on the result
 * within the same function body.
 *
 * Rationale: all API input must be validated with Zod schemas.
 * Using readBody without validation is a safety and consistency risk.
 */

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require Zod validation after readBody() — use .parse() or .safeParse()',
      category: 'ATX Server Safety',
    },
    messages: {
      requireValidation:
        'readBody() result must be validated with Zod .parse() or .safeParse(). See login.post.ts for the pattern.',
    },
    schema: [],
  },

  create(context) {
    // Only run on server API files
    if (!context.filename.includes('/server/')) return {}

    // Track variable names assigned from readBody()
    const readBodyVars = new Map()
    // Track variables that have been validated
    const validatedVars = new Set()

    return {
      // Match: const body = await readBody(event)
      // or:    const body = readBody(event)
      VariableDeclarator(node) {
        const init = node.init
        if (!init) return

        // Unwrap await: const x = await readBody(event)
        const call = init.type === 'AwaitExpression' ? init.argument : init

        if (
          call &&
          call.type === 'CallExpression' &&
          call.callee.type === 'Identifier' &&
          call.callee.name === 'readBody' &&
          node.id.type === 'Identifier'
        ) {
          readBodyVars.set(node.id.name, node)
        }
      },

      // Match: schema.parse(body) or schema.safeParse(body)
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
        }
      },

      // At the end of the program, report any readBody vars not validated
      'Program:exit'() {
        for (const [varName, node] of readBodyVars) {
          if (!validatedVars.has(varName)) {
            context.report({
              node: node.init.type === 'AwaitExpression' ? node.init.argument : node.init,
              messageId: 'requireValidation',
            })
          }
        }
      },
    }
  },
}
