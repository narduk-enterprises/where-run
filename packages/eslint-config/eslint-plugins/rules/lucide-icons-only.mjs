/**
 * atx/lucide-icons-only
 *
 * Disallow non-Lucide icon prefixes (i-heroicons-*, i-mdi-*, etc.)
 * in Vue templates and script setup. Only i-lucide-* is allowed.
 */

import { defineTemplateBodyVisitor } from '../utils.mjs'

const NON_LUCIDE_REGEX = /\bi-(?!lucide-)[a-z]+-[a-z]/

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Only allow Lucide icons (i-lucide-*) — no other icon libraries',
      category: 'ATX Design System',
    },
    messages: {
      lucideOnly: 'Icon "{{ icon }}" uses a non-Lucide prefix — use i-lucide-* icons only.',
    },
    schema: [],
  },

  create(context) {
    if (!context.filename.endsWith('.vue')) return {}

    function checkString(node, value) {
      if (typeof value !== 'string') return
      const match = value.match(NON_LUCIDE_REGEX)
      if (match) {
        context.report({
          node,
          messageId: 'lucideOnly',
          data: { icon: match[0] },
        })
      }
    }

    return defineTemplateBodyVisitor(
      context,
      {
        // Static attributes: icon="i-heroicons-home" or name="i-heroicons-home"
        'VAttribute[key.name="icon"] > VLiteral'(node) {
          checkString(node, node.value)
        },
        'VAttribute[key.name="name"] > VLiteral'(node) {
          checkString(node, node.value)
        },
        // Dynamic attributes: :icon="'i-heroicons-home'"
        'VAttribute[directive=true][key.argument.name="icon"] Literal'(node) {
          checkString(node, node.value)
        },
        'VAttribute[directive=true][key.argument.name="name"] Literal'(node) {
          checkString(node, node.value)
        },
      },
      {
        // Script setup: catches icon strings in data arrays like navItems
        Literal(node) {
          checkString(node, node.value)
        },
      },
    )
  },
}
