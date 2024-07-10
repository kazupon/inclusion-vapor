import { IRNodeTypes } from '@vue-vapor/compiler-vapor'
import { extend, isArray } from '@vue/shared'
import { newBlock } from './transforms/utils'

import type { CompilerCompatOptions } from '@vue-vapor/compiler-dom'
import type { RootIRNode, RootNode } from './ir'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TransformOptions = any // TODO:
const defaultOptions = {}

// TODO:
export class TransformContext<T = unknown> {
  root: TransformContext<RootNode>

  options: Required<Omit<TransformOptions, 'filename' | keyof CompilerCompatOptions>>
  constructor(
    public ir: RootIRNode,
    public node: T,
    options: TransformOptions = {}
  ) {
    this.options = extend({}, defaultOptions, options)
    this.root = this as TransformContext<RootNode>
  }
}

// svelte-AST -> IR
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
  const exitFns = []
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

  // @ts-expect-error -- TODO
  if (context.node.type === IRNodeTypes.ROOT) {
    // context.registerTemplate()
  }
}
