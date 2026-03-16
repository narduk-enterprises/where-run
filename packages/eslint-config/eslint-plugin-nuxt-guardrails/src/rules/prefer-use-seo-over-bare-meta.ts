/**
 * Rule: nuxt-guardrails/prefer-use-seo-over-bare-meta
 *
 * In app/pages/, prefer the useSeo() wrapper over bare useSeoMeta() or useHead().
 * See: check-seo-compliance workflow.
 */

import type { Rule } from 'eslint'

const BARE_META = new Set(['useSeoMeta', 'useHead'])

export default {
  meta: {
    type: 'suggestion' as const,
    docs: {
      description: 'prefer useSeo() over bare useSeoMeta/useHead in pages',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [],
    messages: {
      preferUseSeo:
        'Use useSeo() instead of {{ name }}() for consistent SEO. See template SEO docs.',
    },
  },
  create(context: Rule.RuleContext): Rule.RuleListener {
    const filename = context.filename ?? (context as any).getFilename?.() ?? ''
    const normalized = filename.replace(/\\/g, '/')
    if (!normalized.includes('/app/pages/') || !normalized.endsWith('.vue')) return {}

    return {
      CallExpression(node: any) {
        const name = node.callee?.type === 'Identifier' ? node.callee.name : null
        if (name && BARE_META.has(name)) {
          context.report({
            node: node.callee,
            messageId: 'preferUseSeo',
            data: { name },
          })
        }
      },
    }
  },
}
