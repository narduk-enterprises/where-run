/**
 * atx/no-invalid-nuxt-ui-token
 *
 * Disallow class names that look like Nuxt UI semantic tokens but are not
 * part of Nuxt UI's design system. Use the correct Nuxt UI tokens instead.
 *
 * Nuxt UI semantic tokens (valid):
 * - Text: text-dimmed, text-muted, text-toned, text-default, text-highlighted, text-inverted
 * - Background: bg-default, bg-muted, bg-elevated, bg-accented, bg-inverted
 * - Border: border-default, border-muted, border-accented, border-inverted
 * - Semantic colors: text-primary, bg-primary, etc. (primary, secondary, success, info, warning, error, neutral)
 */

import { defineTemplateBodyVisitor } from '../utils.mjs'

// Invalid tokens we explicitly flag (common mistakes or non-Nuxt UI names).
// Nuxt UI valid tokens: text-dimmed, text-muted, text-toned, text-default, text-highlighted,
// text-inverted; bg-default, bg-muted, bg-elevated, bg-accented, bg-inverted;
// border-default, border-muted, border-accented, border-inverted; text/bg/border-{primary,neutral,...}
const INVALID_SEMANTIC_TOKENS = [
  { token: 'text-foreground', suggest: 'text-default or text-highlighted' },
  { token: 'bg-foreground', suggest: 'bg-default or bg-inverted' },
  { token: 'border-foreground', suggest: 'border-default' },
]

const INVALID_PATTERN = new RegExp(
  `\\b(${INVALID_SEMANTIC_TOKENS.map((t) => t.token.replace(/-/g, '\\-')).join('|')})\\b`,
  'g',
)

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow invalid or non-Nuxt UI semantic class names (e.g. text-foreground) — use Nuxt UI tokens',
      category: 'ATX Design System',
    },
    messages: {
      invalidToken: 'Invalid Nuxt UI token "{{ token }}". Use {{ suggest }}.',
    },
    schema: [],
  },

  create(context) {
    if (!context.filename.endsWith('.vue')) return {}

    const suggestMap = Object.fromEntries(
      INVALID_SEMANTIC_TOKENS.map(({ token, suggest }) => [token, suggest]),
    )

    function checkString(node, str) {
      let match
      INVALID_PATTERN.lastIndex = 0
      while ((match = INVALID_PATTERN.exec(str)) !== null) {
        const token = match[0]
        context.report({
          node,
          messageId: 'invalidToken',
          data: { token, suggest: suggestMap[token] || 'Use a valid Nuxt UI semantic token.' },
        })
      }
    }

    return defineTemplateBodyVisitor(context, {
      'VAttribute[key.name="class"]'(node) {
        if (node.value?.type === 'VLiteral') {
          checkString(node.value, node.value.value)
        }
      },

      'VAttribute[directive=true][key.argument.name="class"] Literal'(node) {
        if (typeof node.value === 'string') {
          checkString(node, node.value)
        }
      },
    })
  },
}
