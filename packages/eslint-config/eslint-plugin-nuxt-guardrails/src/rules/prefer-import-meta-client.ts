/**
 * Rule: nuxt-guardrails/prefer-import-meta-client
 *
 * Detects process.client/process.server and recommends import.meta.client/server
 */

import type { Rule } from 'eslint'
import { isProcessClient, isProcessServer } from '../utils/ast-utils'
import type { PluginOptions } from '../types'

export default {
  meta: {
    type: 'suggestion' as const,
    docs: {
      description: 'prefer import.meta.client/server over process.client/server',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code' as const,
    schema: [
      {
        type: 'object',
        properties: {
          allowProcessClientServer: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      preferImportMetaClient:
        'Use import.meta.client instead of process.client. See: https://nuxt.com/docs/4.x/guide/concepts/rendering',
      preferImportMetaServer:
        'Use import.meta.server instead of process.server. See: https://nuxt.com/docs/4.x/guide/concepts/rendering',
    },
  },
  create(context: Rule.RuleContext): Rule.RuleListener {
    const options = context.options[0] || {}
    const allowProcessClientServer = options.allowProcessClientServer || false

    if (allowProcessClientServer) {
      return {}
    }

    return {
      MemberExpression(node: any) {
        if (isProcessClient(node)) {
          context.report({
            node,
            messageId: 'preferImportMetaClient',
            fix(fixer) {
              return fixer.replaceText(node, 'import.meta.client')
            },
          })
        } else if (isProcessServer(node)) {
          context.report({
            node,
            messageId: 'preferImportMetaServer',
            fix(fixer) {
              return fixer.replaceText(node, 'import.meta.server')
            },
          })
        }
      },
    }
  },
}
