/**
 * Shared utilities for ATX ESLint rules.
 *
 * The key helper is `defineTemplateBodyVisitor` which delegates to
 * vue-eslint-parser's parser services so Vue template AST selectors
 * (VElement, VAttribute, etc.) actually fire.
 */

/**
 * Register visitors for the Vue <template> AST.
 *
 * @param {import('eslint').Rule.RuleContext} context
 * @param {Record<string, Function>} templateVisitor - Selectors for template nodes
 * @param {Record<string, Function>} [scriptVisitor] - Optional selectors for script nodes
 * @returns {Record<string, Function>}
 */
export function defineTemplateBodyVisitor(context, templateVisitor, scriptVisitor) {
  const sourceCode = context.sourceCode
  if (
    sourceCode.parserServices &&
    typeof sourceCode.parserServices.defineTemplateBodyVisitor === 'function'
  ) {
    return sourceCode.parserServices.defineTemplateBodyVisitor(templateVisitor, scriptVisitor)
  }
  // Fallback: not a Vue file or parser services unavailable
  return scriptVisitor || {}
}
