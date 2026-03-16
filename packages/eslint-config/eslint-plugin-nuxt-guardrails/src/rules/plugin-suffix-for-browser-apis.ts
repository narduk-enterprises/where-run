/**
 * Rule: nuxt-guardrails/plugin-suffix-for-browser-apis
 *
 * Plugins that use window/document/localStorage/sessionStorage/navigator must use
 * .client.ts suffix so they only run on the client. Otherwise SSR can crash.
 * See: check-plugin-lifecycle workflow.
 */

import type { Rule } from 'eslint'

const BROWSER_GLOBALS = new Set([
  'window',
  'document',
  'localStorage',
  'sessionStorage',
  'navigator',
])

function referencesBrowserApi(node: any): boolean {
  if (node.type === 'MemberExpression') {
    const name = node.object?.type === 'Identifier' ? node.object.name : null
    if (name && BROWSER_GLOBALS.has(name)) return true
  }
  return false
}

export default {
  meta: {
    type: 'problem' as const,
    docs: {
      description: 'plugins using browser APIs must use .client.ts suffix',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [],
    messages: {
      useClientSuffix:
        'This plugin uses browser APIs (window/document/storage/navigator). Use a .client.ts suffix so it only runs on the client.',
    },
  },
  create(context: Rule.RuleContext): Rule.RuleListener {
    const filename = context.filename ?? (context as any).getFilename?.() ?? ''
    const normalized = filename.replace(/\\/g, '/')
    if (!normalized.includes('/app/plugins/') || !normalized.endsWith('.ts')) return {}
    if (normalized.includes('.client.') || normalized.includes('.server.')) return {}

    let hasBrowserApi = false

    return {
      MemberExpression(node: any) {
        if (referencesBrowserApi(node)) hasBrowserApi = true
      },
      'Program:exit'(node: any) {
        if (hasBrowserApi) {
          context.report({
            node,
            messageId: 'useClientSuffix',
          })
        }
      },
    }
  },
}
