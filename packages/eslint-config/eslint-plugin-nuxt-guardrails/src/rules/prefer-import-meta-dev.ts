/**
 * Rule: nuxt-guardrails/prefer-import-meta-dev
 *
 * In server/ and app/, prefer import.meta.dev over process.env.NODE_ENV (unreliable on Cloudflare Workers).
 */

import type { Rule } from 'eslint'

export default {
  meta: {
    type: 'suggestion' as const,
    docs: {
      description:
        'prefer import.meta.dev over process.env.NODE_ENV for Vite/Nitro and Cloudflare Workers',
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
      useImportMetaDev:
        'Use import.meta.dev instead of process.env.NODE_ENV (reliable in Workers/Vite).',
    },
  },
  create(context: Rule.RuleContext): Rule.RuleListener {
    const options = context.options[0] as { testMode?: boolean } | undefined
    const testMode = options?.testMode === true
    const filename = context.filename ?? (context as any).getFilename?.() ?? ''
    const normalized = filename.replace(/\\/g, '/')

    if (
      !testMode &&
      normalized &&
      !normalized.includes('/server/') &&
      !normalized.includes('/app/')
    ) {
      return {}
    }

    return {
      MemberExpression(node: any) {
        const obj = node.object
        const prop = node.property
        if (
          obj?.type === 'MemberExpression' &&
          obj.object?.type === 'Identifier' &&
          obj.object.name === 'process' &&
          obj.property?.type === 'Identifier' &&
          obj.property.name === 'env' &&
          prop?.type === 'Identifier' &&
          prop.name === 'NODE_ENV'
        ) {
          context.report({
            node,
            messageId: 'useImportMetaDev',
          })
        }
      },
    }
  },
}
