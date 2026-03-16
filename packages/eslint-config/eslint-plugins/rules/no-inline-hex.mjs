/**
 * atx/no-inline-hex
 *
 * Disallow hardcoded hex color literals (#FFF, #22C55E, etc.) in script
 * sections of .vue files and in .ts files under app/.
 *
 * Rationale: all colors should come from Tailwind tokens or CSS variables.
 * Hardcoded hex values create duplication and drift when the palette changes.
 */

import { defineTemplateBodyVisitor } from '../utils.mjs'

const HEX_REGEX = /^#[0-9a-fA-F]{3,8}$/

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow hardcoded hex color literals — use Tailwind tokens or CSS variables',
      category: 'ATX Design System',
    },
    messages: {
      noInlineHex:
        'Hardcoded hex color "{{ color }}" — extract to a composable, CSS variable, or Tailwind token.',
    },
    schema: [],
  },

  create(context) {
    /**
     * Check if a string literal node contains a hex color.
     */
    function checkLiteral(node) {
      if (typeof node.value !== 'string') return
      const val = node.value.trim()
      if (HEX_REGEX.test(val)) {
        context.report({
          node,
          messageId: 'noInlineHex',
          data: { color: val },
        })
      }
    }

    /**
     * Check template literals for hex colors in quasis (static parts).
     * e.g. `${someColor}40` appended to a hex won't false-positive because
     * the quasis alone won't match the full regex.
     */
    function checkTemplateLiteral(node) {
      for (const quasi of node.quasis) {
        const val = quasi.value.raw.trim()
        if (HEX_REGEX.test(val)) {
          context.report({
            node: quasi,
            messageId: 'noInlineHex',
            data: { color: val },
          })
        }
      }
    }

    // For Vue files, check both <script> and <template> sections
    if (context.filename.endsWith('.vue')) {
      return defineTemplateBodyVisitor(
        context,
        // Template visitors — catch :style="{ color: '#EF4444' }"
        {
          'VExpressionContainer Literal'(node) {
            checkLiteral(node)
          },
          'VExpressionContainer TemplateLiteral'(node) {
            checkTemplateLiteral(node)
          },
        },
        // Script visitors — catch const map = { Low: '#22C55E' }
        {
          Literal(node) {
            checkLiteral(node)
          },
          TemplateLiteral(node) {
            checkTemplateLiteral(node)
          },
        },
      )
    }

    // For .ts files under app/
    if (context.filename.includes('/app/') && context.filename.endsWith('.ts')) {
      return {
        Literal(node) {
          checkLiteral(node)
        },
        TemplateLiteral(node) {
          checkTemplateLiteral(node)
        },
      }
    }

    return {}
  },
}
