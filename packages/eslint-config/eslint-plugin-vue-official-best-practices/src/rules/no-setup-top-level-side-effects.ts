/**
 * Rule: vue-official/no-setup-top-level-side-effects
 *
 * Prevents top-level side effects in <script setup> that can cause SSR issues
 */

import type { RuleContext, RuleListener } from 'eslint'
import { VUE_SSR_GUIDE } from '../utils/vue-docs-urls'
import { isDomAccess, isInClientContext, isTopLevel } from '../utils/ast-utils'
import { isNuxtMode, isAllowedNuxtComposable } from '../utils/nuxt-detection'

export default {
  meta: {
    type: 'problem' as const,
    docs: {
      description: 'disallow top-level side effects in <script setup>',
      category: 'Best Practices',
      recommended: true,
      url: VUE_SSR_GUIDE,
    },
    schema: [],
    messages: {
      noTopLevelSideEffect:
        'Avoid top-level side effects in <script setup>. Move to lifecycle hook or user interaction handler. See: {{url}}',
      useNuxtComposable:
        'Use useFetch() or useAsyncData() instead of fetch() for SSR compatibility. See: {{url}}',
    },
  },
  create(context: RuleContext<string, any[]>): RuleListener {
    const parserServices = (context.sourceCode?.parserServices ?? context.parserServices) as any
    const isNuxt = isNuxtMode(context)

    if (!parserServices || !parserServices.defineTemplateBodyVisitor) {
      return {}
    }

    const checkSideEffect = (node: any) => {
      // Skip if not at top level
      if (!isTopLevel(node)) {
        return
      }

      // Skip if in client context (lifecycle hook, etc.)
      if (isInClientContext(node, context)) {
        return
      }

      // Check for Nuxt composables FIRST - these are allowed at top-level in Nuxt
      if (
        isNuxt &&
        node.type === 'CallExpression' &&
        node.callee &&
        node.callee.type === 'Identifier' &&
        isAllowedNuxtComposable(node.callee.name)
      ) {
        // Allow these - they're Nuxt patterns
        return
      }

      // Check for fetch() calls (plain fetch, not useFetch)
      if (
        node.type === 'CallExpression' &&
        node.callee &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'fetch'
      ) {
        // Plain fetch() is not allowed - suggest useFetch/useAsyncData in Nuxt
        context.report({
          node,
          messageId: isNuxt ? 'useNuxtComposable' : 'noTopLevelSideEffect',
          data: { url: VUE_SSR_GUIDE },
        })
        return
      }

      // Check for setInterval/setTimeout
      if (
        node.type === 'CallExpression' &&
        node.callee &&
        node.callee.type === 'Identifier' &&
        (node.callee.name === 'setInterval' || node.callee.name === 'setTimeout')
      ) {
        context.report({
          node,
          messageId: 'noTopLevelSideEffect',
          data: { url: VUE_SSR_GUIDE },
        })
        return
      }

      // Check for addEventListener
      if (
        node.type === 'CallExpression' &&
        node.callee &&
        node.callee.type === 'MemberExpression' &&
        node.callee.property &&
        node.callee.property.name === 'addEventListener'
      ) {
        context.report({
          node,
          messageId: 'noTopLevelSideEffect',
          data: { url: VUE_SSR_GUIDE },
        })
        return
      }

      // Check for DOM access
      const domAccess = isDomAccess(node)
      if (domAccess.type) {
        context.report({
          node,
          messageId: 'noTopLevelSideEffect',
          data: { url: VUE_SSR_GUIDE },
        })
        return
      }
    }

    return parserServices.defineTemplateBodyVisitor(
      {},
      {
        CallExpression: checkSideEffect,
        MemberExpression: checkSideEffect,
        Identifier: checkSideEffect,
      },
    )
  },
}
