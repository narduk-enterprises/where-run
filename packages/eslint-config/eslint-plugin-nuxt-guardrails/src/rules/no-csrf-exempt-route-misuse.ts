/**
 * Rule: nuxt-guardrails/no-csrf-exempt-route-misuse
 *
 * Warns when server routes under CSRF-exempt prefixes (/api/webhooks/,
 * /api/cron/, /api/callbacks/) read request bodies without validating
 * a shared secret or signature header.
 *
 * These prefixes bypass the CSRF middleware entirely. If an agent places
 * user-facing business logic here by mistake, the route is unprotected.
 * Routes that legitimately receive external POSTs should validate a
 * webhook secret via getHeader().
 */

import type { Rule } from 'eslint'

const EXEMPT_PREFIXES = ['/api/webhooks/', '/api/cron/', '/api/callbacks/']

function matchesExemptPrefix(filepath: string): boolean {
  const normalized = filepath.replace(/\\/g, '/')
  return EXEMPT_PREFIXES.some((prefix) => {
    // server/api/webhooks/... maps to /api/webhooks/ in the URL
    const serverPrefix = `server${prefix}`
    return normalized.includes(serverPrefix)
  })
}

export default {
  meta: {
    type: 'suggestion' as const,
    docs: {
      description: 'routes under CSRF-exempt prefixes should validate a shared secret or signature',
      category: 'Security',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          testMode: { type: 'boolean', default: false },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      missingSecretValidation:
        'Routes under /api/webhooks/, /api/cron/, or /api/callbacks/ bypass CSRF protection. ' +
        'Ensure this route validates a shared secret or signature via getHeader(). ' +
        'If this is user-facing, move it outside the exempt prefix.',
    },
  },
  create(context: Rule.RuleContext): Rule.RuleListener {
    const options = context.options[0] as { testMode?: boolean } | undefined
    const testMode = options?.testMode === true
    const filename = context.filename ?? (context as any).getFilename?.() ?? ''
    const normalized = filename.replace(/\\/g, '/')

    if (!testMode && !matchesExemptPrefix(normalized)) return {}

    let hasReadBody = false
    let hasGetHeader = false

    return {
      CallExpression(node: any) {
        const callee = node.callee
        if (!callee) return

        const name = callee.type === 'Identifier' ? callee.name : null

        if (name === 'readBody') hasReadBody = true
        if (name === 'getHeader') hasGetHeader = true
      },

      'Program:exit'(node: any) {
        if (hasReadBody && !hasGetHeader) {
          context.report({
            node,
            messageId: 'missingSecretValidation',
          })
        }
      },
    }
  },
}
