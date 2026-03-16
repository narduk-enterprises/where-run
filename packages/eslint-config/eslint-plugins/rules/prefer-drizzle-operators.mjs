/**
 * atx/prefer-drizzle-operators
 *
 * Flags sql`` tagged template literals that use simple SQL patterns
 * expressible with Drizzle ORM operator functions.
 *
 * Caught patterns:
 *   sql`... IS NULL`        → use isNull()
 *   sql`... IS NOT NULL`    → use isNotNull()
 *   sql`... DESC`           → use desc()
 *   sql`... ASC`            → use asc()
 *
 * Intentionally NOT flagged (complex SQL that Drizzle can't express):
 *   - Aggregate functions (AVG, COUNT, SUM, etc.)
 *   - Window functions
 *   - strftime / date functions
 *   - GROUP BY / HAVING
 *   - Subqueries
 *   - INSERT OR REPLACE / UPSERT
 */

const SIMPLE_PATTERNS = [
  { regex: /\bIS\s+NOT\s+NULL\b/i, replacement: 'isNotNull()' },
  { regex: /\bIS\s+NULL\b/i, replacement: 'isNull()' },
  { regex: /\bDESC\s*$/i, replacement: 'desc()' },
  { regex: /\bASC\s*$/i, replacement: 'asc()' },
]

// Patterns that indicate complex SQL — skip the entire template
const COMPLEX_PATTERNS = [
  /\bAVG\s*\(/i,
  /\bCOUNT\s*\(/i,
  /\bSUM\s*\(/i,
  /\bMIN\s*\(/i,
  /\bMAX\s*\(/i,
  /\bGROUP\s+BY\b/i,
  /\bHAVING\b/i,
  /\bstrftime\b/i,
  /\bINSERT\b/i,
  /\bUPDATE\b/i,
  /\bDELETE\b/i,
  /\bJOIN\b/i,
  /\bUNION\b/i,
  /\bWINDOW\b/i,
  /\bOVER\s*\(/i,
  /\bCASE\b/i,
  /\bWHEN\b/i,
]

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer Drizzle ORM operators (isNull, isNotNull, desc, asc) over raw sql`` for simple patterns',
      category: 'ATX Server Safety',
    },
    messages: {
      preferDrizzle:
        'sql`` contains "{{ pattern }}" which can be replaced with Drizzle\'s {{ replacement }}.',
    },
    schema: [],
  },

  create(context) {
    // Only run on server files
    if (!context.filename.includes('/server/')) return {}

    return {
      TaggedTemplateExpression(node) {
        // Match: sql`...`
        if (node.tag.type !== 'Identifier' || node.tag.name !== 'sql') return

        // Combine all quasis into a single string for analysis
        const fullSql = node.quasi.quasis.map((q) => q.value.raw).join('?')

        // Skip complex SQL that legitimately needs raw sql``
        for (const complex of COMPLEX_PATTERNS) {
          if (complex.test(fullSql)) return
        }

        // Check for simple patterns that have Drizzle equivalents
        for (const { regex, replacement } of SIMPLE_PATTERNS) {
          if (regex.test(fullSql)) {
            context.report({
              node,
              messageId: 'preferDrizzle',
              data: {
                pattern: fullSql.match(regex)[0],
                replacement,
              },
            })
            return // Report once per sql`` — avoid noise
          }
        }
      },
    }
  },
}
