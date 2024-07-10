import { IRNodeTypes } from '@vue-vapor/compiler-vapor'
import { newBlock } from './transforms/utils'

import type { RootIRNode, RootNode } from './ir'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TransformOptions = any // TODO:

// svelte-AST -> IR
export function transform(node: RootNode, _options: TransformOptions = {}): RootIRNode {
  const ir: RootIRNode = {
    type: IRNodeTypes.ROOT,
    node,
    source: node.source,
    template: [],
    component: new Set(),
    directive: new Set(),
    block: newBlock(node)
  }

  return ir
}
