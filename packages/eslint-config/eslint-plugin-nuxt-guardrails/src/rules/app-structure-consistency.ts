/**
 * Rule: nuxt-guardrails/app-structure-consistency
 *
 * Warns on conflicting legacy structure usage when app/ is used
 */

import type { Rule } from 'eslint'
import { existsSync } from 'fs'
import { join } from 'path'
import type { PluginOptions } from '../types'

export default {
  meta: {
    type: 'suggestion' as const,
    docs: {
      description: 'enforce consistent directory structure',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          projectStyle: {
            type: 'string',
            enum: ['app-dir', 'mixed', 'legacy', 'auto'],
            default: 'auto',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      conflictingStructure:
        'Found both app/pages/ and pages/ directories. This may cause routing conflicts. Prefer app/ structure for Nuxt 4. See: https://nuxt.com/docs/4.x/guide/directory-structure/app',
    },
  },
  create(context: Rule.RuleContext): Rule.RuleListener {
    const options = context.options[0] || {}
    const projectStyle = options.projectStyle || 'auto'

    // Only check once per file
    let hasChecked = false

    return {
      'Program:exit'(node: any) {
        if (hasChecked || projectStyle === 'legacy') {
          return
        }

        hasChecked = true

        // Get CWD - ESLint 9+ has getCwd(), fallback to process.cwd()
        const cwd = (context as any).getCwd ? (context as any).getCwd() : process.cwd()
        const appPagesExists = existsSync(join(cwd, 'app/pages'))
        const rootPagesExists = existsSync(join(cwd, 'pages'))

        if (appPagesExists && rootPagesExists && projectStyle !== 'mixed') {
          context.report({
            node,
            messageId: 'conflictingStructure',
          })
        }
      },
    }
  },
} satisfies Rule.RuleModule
