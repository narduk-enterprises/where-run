/**
 * Type declarations for ESLint
 * ESLint 9 types are available from the eslint package
 */

declare module 'eslint' {
  export interface RuleContext<TMessageIds extends string, TOptions extends readonly unknown[]> {
    getSourceCode(): any
    getFilename(): string
    getCwd(): string
    report(descriptor: {
      node: any
      messageId: TMessageIds
      data?: Record<string, any>
      fix?: (fixer: any) => any
    }): void
    options: TOptions
    parserServices?: any
    settings?: any
  }

  export interface RuleListener {
    [key: string]: ((node: any) => void) | undefined
  }
}
