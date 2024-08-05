declare module 'svelte/compiler' {
  import type { Node } from 'estree'
  import type { File } from '@babel/types'
  import type { BaseNode, Ast } from 'svelte/types/compiler/interfaces'

  export interface ShorthandAttribute extends BaseNode {
    type: 'AttributeShorthand'
    expression: Node
  }

  export interface Text extends BaseNode {
    type: 'Text'
    data: string
    raw: string
  }

  export interface Script extends BaseNode {
    type: 'Script'
    context: string
    content: File
  }
}

export {}
