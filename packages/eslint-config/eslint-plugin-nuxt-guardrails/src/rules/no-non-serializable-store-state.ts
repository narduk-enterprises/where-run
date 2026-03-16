/**
 * Rule: nuxt-guardrails/no-non-serializable-store-state
 *
 * Map, Set, Date, and class instances cannot be serialized for SSR hydration.
 * Store state should use plain objects and arrays.
 * See: check-ssr-hydration-safety workflow.
 */

import type { Rule } from 'eslint'

export default {
  meta: {
    type: 'problem' as const,
    docs: {
      description:
        'disallow ref<Map>/ref<Set>/new Map()/new Set() in app/stores for SSR serialization',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [],
    messages: {
      nonSerializable:
        'Store state must be serializable for SSR. Avoid Map, Set, Date, or class instances. Use plain objects/arrays or shallowRef + skipHydrate if needed.',
    },
  },
  create(context: Rule.RuleContext): Rule.RuleListener {
    const filename = context.filename ?? (context as any).getFilename?.() ?? ''
    const normalized = filename.replace(/\\/g, '/')
    if (!normalized.includes('/app/stores/') || !normalized.endsWith('.ts')) return {}

    function isMapOrSetType(node: any): boolean {
      if (node?.type === 'TSTypeReference' && node.typeName?.type === 'Identifier') {
        const n = node.typeName.name
        return n === 'Map' || n === 'Set'
      }
      return false
    }

    return {
      // ref<Map>, ref<Set> — ref() call with type args
      CallExpression(node: any) {
        const callee = node.callee
        const name = callee?.type === 'Identifier' ? callee.name : null
        if (name !== 'ref' && name !== 'shallowRef') return {}
        const typeArgs = node.typeArguments?.params ?? node.typeParameters?.params ?? []
        for (const t of typeArgs) {
          if (isMapOrSetType(t)) {
            context.report({ node: callee, messageId: 'nonSerializable' })
            return
          }
        }
      },
      // new Map(), new Set()
      NewExpression(node: any) {
        const name = node.callee?.type === 'Identifier' ? node.callee.name : null
        if (name === 'Map' || name === 'Set') {
          context.report({ node: node.callee, messageId: 'nonSerializable' })
        }
      },
    }
  },
}
