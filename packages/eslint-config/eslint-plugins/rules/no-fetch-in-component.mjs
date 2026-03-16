/**
 * atx/no-fetch-in-component
 *
 * Disallow `useFetch()` and `$fetch()` calls inside Vue page/component files.
 *
 * Rationale: data-fetching logic belongs in composables (`app/composables/`),
 * not directly in `<script setup>`. Extracting fetches to composables keeps
 * pages thin, enables reuse, and centralises caching / error handling.
 *
 * `useAsyncData` with Nuxt Content queries is intentionally NOT flagged —
 * those are local content lookups, not network API calls.
 */

import { defineTemplateBodyVisitor } from '../utils.mjs'

const FETCH_FUNCTIONS = new Set(['useFetch', '$fetch'])

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow useFetch / $fetch in Vue files — extract to a composable',
      category: 'ATX Architecture',
    },
    messages: {
      noFetchInComponent:
        'Move `{{ name }}()` to a composable in `app/composables/`. Pages should receive data via composable return values.',
    },
    schema: [],
  },

  create(context) {
    if (!context.filename.endsWith('.vue')) return {}

    function checkCall(node) {
      const callee = node.callee
      // Direct call: useFetch(…) or $fetch(…)
      if (callee.type === 'Identifier' && FETCH_FUNCTIONS.has(callee.name)) {
        context.report({
          node,
          messageId: 'noFetchInComponent',
          data: { name: callee.name },
        })
      }
    }

    // Use defineTemplateBodyVisitor so the rule fires in <script setup>
    return defineTemplateBodyVisitor(
      context,
      {}, // no template visitors needed
      {
        CallExpression: checkCall,
      },
    )
  },
}
