/**
 * atx/no-raw-tailwind-colors
 *
 * Disallow raw Tailwind color scale classes like `text-gray-400`, `bg-zinc-900`,
 * `bg-emerald-500` in Vue templates. Use Nuxt UI semantic classes instead
 * (text-dimmed, text-muted, text-primary, bg-elevated, bg-muted, etc.)
 */

import { defineTemplateBodyVisitor } from '../utils.mjs'

const GRAY_SCALES = ['gray', 'zinc', 'slate', 'stone', 'neutral']
const BRAND_COLORS = [
  'green',
  'emerald',
  'blue',
  'red',
  'yellow',
  'orange',
  'purple',
  'pink',
  'indigo',
  'teal',
  'cyan',
  'amber',
  'lime',
  'fuchsia',
  'violet',
  'rose',
  'sky',
]

const ALL_COLORS = [...GRAY_SCALES, ...BRAND_COLORS]

// Matches text-gray-400, bg-emerald-500, border-zinc-800 etc.
const COLOR_REGEX = new RegExp(
  `\\b(?:text|bg|border|ring|shadow|divide|from|via|to|outline|accent|caret|fill|stroke)-(?:${ALL_COLORS.join('|')})-\\d{2,3}\\b`,
  'g',
)

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow raw Tailwind color classes — use Nuxt UI semantic classes',
      category: 'ATX Design System',
    },
    messages: {
      noRawColor:
        'Raw Tailwind color "{{ color }}" — use semantic classes instead (text-dimmed, text-muted, text-primary, bg-elevated, bg-muted, bg-default, border-default).',
    },
    schema: [],
  },

  create(context) {
    if (!context.filename.endsWith('.vue')) return {}

    function checkString(node, str) {
      let match
      COLOR_REGEX.lastIndex = 0
      while ((match = COLOR_REGEX.exec(str)) !== null) {
        context.report({
          node,
          messageId: 'noRawColor',
          data: { color: match[0] },
        })
      }
    }

    return defineTemplateBodyVisitor(context, {
      // Static class="text-gray-400 ..."
      'VAttribute[key.name="class"]'(node) {
        if (node.value && node.value.type === 'VLiteral') {
          checkString(node.value, node.value.value)
        }
      },

      // Dynamic :class="{ 'text-gray-400': condition }" or :class="['text-gray-400']"
      'VAttribute[directive=true][key.argument.name="class"] Literal'(node) {
        if (typeof node.value === 'string') {
          checkString(node, node.value)
        }
      },
    })
  },
}
