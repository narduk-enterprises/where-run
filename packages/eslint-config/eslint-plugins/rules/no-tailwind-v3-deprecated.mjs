/**
 * atx/no-tailwind-v3-deprecated
 *
 * Disallow Tailwind v3 class names that were renamed or removed in Tailwind v4.
 * - flex-shrink-* → shrink-*
 * - flex-grow-* → grow-*
 * - bg-gradient-to-* → bg-linear-to-*
 */

import { defineTemplateBodyVisitor } from '../utils.mjs'

function applyFixes(str) {
  return str
    .replace(/\bflex-shrink-(\S+)\b/g, 'shrink-$1')
    .replace(/\bflex-shrink\b/g, 'shrink')
    .replace(/\bflex-grow-(\S+)\b/g, 'grow-$1')
    .replace(/\bflex-grow\b/g, 'grow')
    .replace(/\bbg-gradient-to-(r|l|t|b|tr|tl|br|bl)\b/g, 'bg-linear-to-$1')
}

function findFirstDeprecated(str) {
  const m =
    str.match(/\bflex-shrink(-\S+)?\b/) ||
    str.match(/\bflex-grow(-\S+)?\b/) ||
    str.match(/\bbg-gradient-to-(?:r|l|t|b|tr|tl|br|bl)\b/)
  return m ? m[0] : null
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow Tailwind v3 class names renamed in v4 (flex-shrink→shrink, bg-gradient-to-*→bg-linear-to-*)',
      category: 'ATX Design System',
    },
    fixable: 'code',
    messages: {
      deprecated:
        'Tailwind v3 class "{{ bad }}" is deprecated in v4. Use "{{ replacement }}" instead.',
    },
    schema: [],
  },

  create(context) {
    if (!context.filename.endsWith('.vue')) return {}

    function checkString(node, str, getTargetNode) {
      const fixed = applyFixes(str)
      if (fixed === str) return
      const bad = findFirstDeprecated(str)
      const replacement = bad
        ? bad.startsWith('bg-gradient-to-')
          ? 'bg-linear-to-' + bad.slice('bg-gradient-to-'.length)
          : bad.replace(/^flex-shrink/, 'shrink').replace(/^flex-grow/, 'grow')
        : 'see fix'
      const targetNode = getTargetNode?.()
      const isStaticAttr = targetNode?.type === 'VLiteral'
      context.report({
        node,
        messageId: 'deprecated',
        data: { bad, replacement },
        fix: targetNode
          ? (fixer) =>
              fixer.replaceText(
                targetNode,
                isStaticAttr ? `"${fixed}"` : `'${fixed.replace(/'/g, "\\'")}'`,
              )
          : undefined,
      })
    }

    return defineTemplateBodyVisitor(context, {
      'VAttribute[key.name="class"]'(node) {
        if (node.value?.type === 'VLiteral') {
          checkString(node.value, node.value.value, () => node.value)
        }
      },

      'VAttribute[directive=true][key.argument.name="class"] Literal'(node) {
        if (typeof node.value === 'string') {
          checkString(node, node.value, () => node)
        }
      },
    })
  },
}
