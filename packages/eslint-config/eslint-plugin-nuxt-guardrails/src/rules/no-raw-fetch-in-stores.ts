/**
 * Rule: nuxt-guardrails/no-raw-fetch-in-stores
 *
 * Store fetch actions must use useAppFetch() or useRequestFetch() (or accept fetchFn)
 * so cookie/auth proxying works during SSR.
 * See: check-data-fetching and check-architecture workflows.
 */

import type { Rule } from 'eslint'

const ALLOWED = new Set(['useAppFetch', 'useRequestFetch'])

export default {
  meta: {
    type: 'problem' as const,
    docs: {
      description: 'disallow $fetch/useFetch in app/stores — use useAppFetch or useRequestFetch',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [],
    messages: {
      rawFetchInStore:
        'Stores must use useAppFetch() or useRequestFetch() for SSR cookie/auth proxying. Avoid $fetch/useFetch in app/stores/.',
    },
  },
  create(context: Rule.RuleContext): Rule.RuleListener {
    const filename = context.filename ?? (context as any).getFilename?.() ?? ''
    const normalized = filename.replace(/\\/g, '/')
    if (!normalized.includes('/app/stores/') || !normalized.endsWith('.ts')) return {}

    return {
      CallExpression(node: any) {
        const callee = node.callee
        const name =
          callee?.type === 'Identifier'
            ? callee.name
            : callee?.type === 'MemberExpression' && callee.property?.type === 'Identifier'
              ? callee.property.name
              : null
        if (name !== '$fetch' && name !== 'useFetch') return
        context.report({
          node: callee,
          messageId: 'rawFetchInStore',
        })
      },
    }
  },
}
