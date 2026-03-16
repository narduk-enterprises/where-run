/**
 * Rule: nuxt-guardrails/no-map-async-in-server
 *
 * The .map(async ...) pattern in server API handlers usually indicates N+1 queries.
 * Prefer batched queries (e.g. .in('id', ids)) instead.
 * See: check-data-fetching workflow.
 */

import type { Rule } from 'eslint'

export default {
  meta: {
    type: 'problem' as const,
    docs: {
      description: 'disallow .map(async in server code — use batched queries to avoid N+1',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [],
    messages: {
      mapAsync:
        '.map(async ...) in server code often causes N+1 queries. Prefer batched queries (e.g. .in("id", ids)).',
    },
  },
  create(context: Rule.RuleContext): Rule.RuleListener {
    const filename = context.filename ?? (context as any).getFilename?.() ?? ''
    const normalized = filename.replace(/\\/g, '/')
    if (!normalized.includes('/server/')) return {}

    return {
      CallExpression(node: any) {
        const callee = node.callee
        if (!callee || callee.type !== 'MemberExpression') return
        const prop = callee.property
        if (prop?.type !== 'Identifier' || prop.name !== 'map') return
        const args = node.arguments
        if (args.length === 0) return
        const first = args[0]
        if (
          !first ||
          (first.type !== 'ArrowFunctionExpression' && first.type !== 'FunctionExpression')
        )
          return
        if (first.async) {
          context.report({
            node: callee.property,
            messageId: 'mapAsync',
          })
        }
      },
    }
  },
}
