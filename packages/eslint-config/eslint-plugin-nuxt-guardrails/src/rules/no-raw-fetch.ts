/**
 * Rule: nuxt-guardrails/no-raw-fetch
 *
 * Disallow raw $fetch in script setup (pages/components). Use useAsyncData or useFetch
 * so Nuxt can dedupe and avoid double-fetch / hydration mismatches.
 */

import type { Rule } from 'eslint'

const DOC_URL = 'https://nuxt.com/docs/api/composables/use-fetch'

export default {
  meta: {
    type: 'problem' as const,
    docs: {
      description:
        'disallow raw $fetch in script — use useAsyncData or useFetch for SSR-safe data fetching',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          /** When true, run the rule regardless of filename (for testing). */
          testMode: { type: 'boolean', default: false },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      rawFetch:
        'Raw $fetch causes double-fetch and hydration issues. Use useAsyncData() or useFetch() instead. See: ' +
        DOC_URL,
    },
  },
  create(context: Rule.RuleContext): Rule.RuleListener {
    const options = context.options[0] as { testMode?: boolean } | undefined
    const testMode = options?.testMode === true
    const filename = context.filename ?? (context as any).getFilename?.() ?? ''
    const normalized = filename.replace(/\\/g, '/')

    if (!testMode && normalized) {
      const inPages = normalized.includes('/app/pages/')
      const inComponents = normalized.includes('/app/components/')
      if (!inPages && !inComponents) return {}
      if (
        normalized.includes('e2e/') ||
        normalized.includes('.spec.') ||
        normalized.includes('.test.')
      )
        return {}
    }

    return {
      CallExpression(node: any) {
        const callee = node.callee
        if (!callee) return
        const name =
          callee.type === 'Identifier'
            ? callee.name
            : callee.type === 'MemberExpression' && callee.property?.type === 'Identifier'
              ? callee.property.name
              : null
        if (name !== '$fetch') return

        context.report({
          node: callee,
          messageId: 'rawFetch',
        })
      },
    }
  },
}
