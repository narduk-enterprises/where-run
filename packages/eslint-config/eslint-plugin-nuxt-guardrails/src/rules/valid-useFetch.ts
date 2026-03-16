/**
 * Rule: nuxt-guardrails/valid-useFetch
 *
 * Validates useFetch usage patterns
 */

import type { Rule } from 'eslint'
import { getApiSpec } from '../utils/spec-loader'

export default {
  meta: {
    type: 'problem' as const,
    docs: {
      description: 'enforce valid useFetch usage',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [],
    messages: {
      missingUrl: 'useFetch requires a URL as first argument. See: {{docUrl}}',
      invalidOptions: 'useFetch options may be invalid. See: {{docUrl}}',
    },
  },
  create(context: Rule.RuleContext): Rule.RuleListener {
    const useFetchSpec = getApiSpec('useFetch')
    const docUrl = useFetchSpec?.docUrl || 'https://nuxt.com/docs/api/composables/use-fetch'

    return {
      CallExpression(node: any) {
        if (
          !node.callee ||
          (node.callee.type !== 'Identifier' && node.callee.type !== 'MemberExpression') ||
          (node.callee.type === 'Identifier' && node.callee.name !== 'useFetch') ||
          (node.callee.type === 'MemberExpression' &&
            node.callee.property &&
            node.callee.property.name !== 'useFetch')
        ) {
          return
        }

        const args = node.arguments || []

        // Check for URL (first arg)
        if (args.length === 0) {
          context.report({
            node,
            messageId: 'missingUrl',
            data: { docUrl },
          })
          return
        }

        // Basic validation - URL should be a string or function
        const urlArg = args[0]
        if (
          urlArg.type !== 'Literal' &&
          urlArg.type !== 'TemplateLiteral' &&
          urlArg.type !== 'ArrowFunctionExpression' &&
          urlArg.type !== 'FunctionExpression'
        ) {
          // This might be valid (e.g., computed ref), so we don't error
          // But we could warn if it's clearly wrong
        }

        // If there's a second arg (options), validate option keys against spec
        if (args.length > 1 && args[1].type === 'ObjectExpression' && useFetchSpec?.options) {
          const options = args[1]
          const validOptionKeys = new Set(Object.keys(useFetchSpec.options))

          for (const prop of options.properties) {
            if (prop.type === 'Property' && prop.key && prop.key.type === 'Identifier') {
              const key = prop.key.name
              // Common valid options that might not be in spec
              const commonOptions = new Set([
                'server',
                'default',
                'key',
                'lazy',
                'immediate',
                'watch',
                'getCachedData',
                'pick',
                'transform',
              ])

              if (!validOptionKeys.has(key) && !commonOptions.has(key)) {
                // Don't error on unknown options - they might be valid
                // This is more of a linting hint
              }
            }
          }
        }
      },
    }
  },
}
