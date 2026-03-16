/**
 * atx/no-style-block-layout
 *
 * Warn when a <style scoped> block in a Vue SFC exceeds 50 lines.
 * Layout CSS should use Tailwind utility classes, not custom CSS.
 *
 * NOTE: This rule uses defineDocumentVisitor-like approach since
 * <style> blocks are document-level, not template-level nodes.
 * We use a Program listener to walk the document fragment.
 */

const MAX_LINES = 50

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Warn against large <style scoped> blocks — use Tailwind utilities for layout',
      category: 'ATX Design System',
    },
    messages: {
      tooManyStyleLines:
        '<style scoped> has {{ lines }} lines (max {{ max }}). Use Tailwind utility classes for layout instead of custom CSS.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          max: { type: 'integer', minimum: 10 },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    if (!context.filename.endsWith('.vue')) return {}

    const maxLines = (context.options[0] && context.options[0].max) || MAX_LINES

    // Use the document visitor to access root-level elements like <style>
    const sourceCode = context.sourceCode
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

          const start = node.startTag.loc.end.line
          const end = node.endTag ? node.endTag.loc.start.line : start
          const lines = end - start

          if (lines > maxLines) {
            context.report({
              node: node.startTag,
              messageId: 'tooManyStyleLines',
              data: { lines: String(lines), max: String(maxLines) },
            })
          }
        },
      })
    }

    // Fallback: scan source text with regex
    return {
      Program() {
        const text = sourceCode.getText()
        const regex = /<style\s+scoped[^>]*>([\s\S]*?)<\/style>/g
        let match
        while ((match = regex.exec(text)) !== null) {
          const lines = match[1].split('\n').length
          if (lines > maxLines) {
            context.report({
              loc: { line: 1, column: 0 },
              messageId: 'tooManyStyleLines',
              data: { lines: String(lines), max: String(maxLines) },
            })
          }
        }
      },
    }
  },
}
