/**
 * Type declarations for vue-eslint-parser
 * Used to avoid requiring vue-eslint-parser as a dependency during type checking
 */

declare module 'vue-eslint-parser' {
  export namespace AST {
    export interface Node {
      type: string
      range?: [number, number]
    }

    export interface VElement extends Node {
      type: 'VElement'
      name: string
      startTag: VStartTag
      children: Node[]
    }

    export interface VStartTag extends Node {
      type: 'VStartTag'
      attributes: Array<VAttribute | VDirective>
    }

    export interface VAttribute extends Node {
      type: 'VAttribute'
      key: VIdentifier | VDirectiveKey
      value?: VLiteral | VExpressionContainer
    }

    export interface VDirective extends Node {
      type: 'VDirective'
      key: VDirectiveKey
      value?: VExpressionContainer
    }

    export interface VDirectiveKey extends Node {
      type: 'VDirectiveKey'
      name: VIdentifier
      argument?: VIdentifier | VExpressionContainer
    }

    export interface VIdentifier extends Node {
      type: 'VIdentifier'
      name: string
      range?: [number, number]
    }

    export interface VLiteral extends Node {
      type: 'VLiteral'
      value: string | number | boolean | null
      range?: [number, number]
    }

    export interface VExpressionContainer extends Node {
      type: 'VExpressionContainer'
      expression: unknown
    }
  }
}
