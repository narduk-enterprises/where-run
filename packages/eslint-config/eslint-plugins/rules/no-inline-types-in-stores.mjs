/**
 * atx/no-inline-types-in-stores
 *
 * Interfaces and type aliases in store files should be extracted to app/types/
 * for reuse across composables. See: check-architecture workflow.
 */

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow inline interface/type in app/stores — extract to app/types/',
      category: 'ATX Architecture',
    },
    messages: {
      inlineType: 'Extract interface/type to app/types/ for reuse. Stores should be thin.',
    },
    schema: [],
  },

  create(context) {
    const filename = context.filename || context.getFilename?.() || ''
    const normalized = filename.replace(/\\/g, '/')
    if (!normalized.includes('/app/stores/') || !normalized.endsWith('.ts')) return {}

    return {
      TSInterfaceDeclaration(node) {
        context.report({
          node: node.id,
          messageId: 'inlineType',
        })
      },
      TSTypeAliasDeclaration(node) {
        context.report({
          node: node.id,
          messageId: 'inlineType',
        })
      },
    }
  },
}
