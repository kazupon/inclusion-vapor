import { isArray } from '@vue-vapor/shared'
import { newBlock } from './transforms/utils'
import { IRNodeTypes } from './ir'
import { TransformContext } from './transforms'

import type { RootIRNode, RootNode } from './ir'
import type { NodeTransform, TransformOptions } from './transforms'

// // A structural directive transform is technically also a NodeTransform;
// // Only v-if and v-for fall into this category.
// export type StructuralDirectiveTransform = (
//   node: SvelteElement,
//   dir: VaporDirectiveNode,
//   context: TransformContext<SvelteElement>,
// ) => void | (() => void)

// Svelte AST -> IR
export function transform(node: RootNode, options: TransformOptions = {}): RootIRNode {
  const ir: RootIRNode = {
    type: IRNodeTypes.ROOT,
    node,
    source: node.source,
    template: [],
    component: new Set(),
    directive: new Set(),
    block: newBlock(node)
  }

  const context = new TransformContext(ir, node, options)

  transformNode(context)

  return ir
}

export function transformNode(context: TransformContext): void {
  let { node } = context

  // apply transform plugins
  const { nodeTransforms } = context.options
  const exitFns: ReturnType<NodeTransform> = []
  for (const nodeTransform of nodeTransforms) {
    const onExit = nodeTransform(node, context)
    if (onExit) {
      if (isArray(onExit)) {
        exitFns.push(...onExit)
      } else {
        exitFns.push(onExit)
      }
    }
    if (context.node) {
      // node may have been replaced
      node = context.node
    } else {
      // node was removed
      return
    }
  }

  // exit transforms
  context.node = node
  let i = exitFns.length
  while (i--) {
    exitFns[i]()
  }

  if (context.node.type === IRNodeTypes.ROOT) {
    context.registerTemplate()
  }
}
