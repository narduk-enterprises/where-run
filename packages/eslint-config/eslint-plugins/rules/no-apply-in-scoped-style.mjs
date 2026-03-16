/**
 * atx/no-apply-in-scoped-style
 *
 * Using @apply inside <style scoped> (especially with :deep()) can trigger
 * "Cannot apply unknown utility class" during SSR. Use CSS variables or
 * inline Tailwind utilities instead. See: check-ui-styling workflow.
 */

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow @apply inside <style scoped> — use CSS variables or inline utilities',
      category: 'ATX Design System',
    },
    messages: {
      noApplyInScoped:
        'Avoid @apply in <style scoped> (SSR issues). Use CSS variables (e.g. var(--color-neutral-100)) or Tailwind utilities in the template.',
    },
    schema: [],
  },

  create(context) {
    if (!context.filename.endsWith('.vue')) return {}

    const sourceCode = context.sourceCode || context.getSourceCode()

    if (
      sourceCode.parserServices &&
      typeof sourceCode.parserServices.defineDocumentVisitor === 'function'
    ) {
      return sourceCode.parserServices.defineDocumentVisitor({
        'VElement[name="style"]'(node) {
          const hasScoped = node.startTag.attributes.some(
            (attr) => attr.key && attr.key.name === 'scoped',
          )
          if (!hasScoped) return

          const start = node.startTag.range[1]
          const end = node.endTag ? node.endTag.range[0] : start
          const content = sourceCode.getText().slice(start, end)
          if (content.includes('@apply')) {
            context.report({
              node: node.startTag,
              messageId: 'noApplyInScoped',
            })
          }
        },
      })
    }

    // Fallback: regex on full source
    return {
      Program() {
        const text = sourceCode.getText()
        const regex = /<style\s+scoped[^>]*>([\s\S]*?)<\/style>/g
        let match
        while ((match = regex.exec(text)) !== null) {
          if (match[1].includes('@apply')) {
            context.report({
              loc: { line: 1, column: 0 },
              messageId: 'noApplyInScoped',
            })
            break
          }
        }
      },
    }
  },
}
