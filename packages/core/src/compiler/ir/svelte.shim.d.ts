declare module 'svelte/compiler' {
  import type { Node } from 'estree'
  import type { BaseNode } from 'svelte/types/compiler/interfaces'

  export interface ShorthandAttribute extends BaseNode {
    type: 'AttributeShorthand'
    expression: Node
  }

  export interface Text extends BaseNode {
    type: 'Text'
    data: string
    raw: string
  }
}

export {}
