/**
 * atx/no-module-scope-ref
 *
 * Module-scope ref() in composables/utils leaks state across SSR requests.
 * Use useState() or define inside a function. See: check-architecture workflow.
 */

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow top-level ref() in app/composables and app/utils — use useState() or in-function ref',
      category: 'ATX Architecture',
    },
    messages: {
      moduleScopeRef:
        'Module-scope ref() leaks state across SSR requests. Use useState() or define ref inside a composable/function.',
    },
    schema: [],
  },

  create(context) {
    const filename = context.filename || context.getFilename?.() || ''
    const normalized = filename.replace(/\\/g, '/')
    if (
      (!normalized.includes('/app/composables/') && !normalized.includes('/app/utils/')) ||
      !normalized.endsWith('.ts')
    ) {
      return {}
    }

    function isInsideFunction(node) {
      let n = node.parent
      while (n) {
        if (
          n.type === 'FunctionDeclaration' ||
          n.type === 'FunctionExpression' ||
          n.type === 'ArrowFunctionExpression' ||
          n.type === 'TSDeclareFunction'
        ) {
          return true
        }
        n = n.parent
      }
      return false
    }

    return {
      VariableDeclarator(node) {
        if (!node.init || node.init.type !== 'CallExpression') return
        const callee = node.init.callee
        const name = callee?.type === 'Identifier' ? callee.name : null
        if (name !== 'ref' && name !== 'shallowRef') return
        if (isInsideFunction(node)) return
        context.report({
          node: node.init.callee,
          messageId: 'moduleScopeRef',
        })
      },
    }
  },
}
