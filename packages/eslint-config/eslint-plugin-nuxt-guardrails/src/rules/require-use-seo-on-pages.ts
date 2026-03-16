/**
 * Rule: nuxt-guardrails/require-use-seo-on-pages
 *
 * Every page in app/pages/ must call useSeo() for consistent title, description, and OG image.
 * See: check-seo-compliance workflow.
 */

import type { Rule } from 'eslint'

export default {
  meta: {
    type: 'problem' as const,
    docs: {
      description: 'require useSeo() in app/pages/*.vue for consistent SEO',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [],
    messages: {
      missingUseSeo:
        'Page must call useSeo() for title, description, and OG image. See template SEO docs.',
    },
  },
  create(context: Rule.RuleContext): Rule.RuleListener {
    const filename = context.filename ?? (context as any).getFilename?.() ?? ''
    const normalized = filename.replace(/\\/g, '/')
    if (!normalized.includes('/app/pages/') || !normalized.endsWith('.vue')) return {}

    let hasUseSeo = false

    return {
      CallExpression(node: any) {
        const name = node.callee?.type === 'Identifier' ? node.callee.name : null
        if (name === 'useSeo') hasUseSeo = true
      },
      'Program:exit'(node: any) {
        if (!hasUseSeo) {
          context.report({
            node,
            messageId: 'missingUseSeo',
          })
        }
      },
    }
  },
}
