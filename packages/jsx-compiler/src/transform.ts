// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `unplugin-vue-jsx-vapor`
// Author: zhiyuanzmj (https://github.com/zhiyuanzmj) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/unplugin/unplugin-vue-jsx-vapor
// Code url: https://github.com/unplugin/unplugin-vue-jsx-vapor/tree/main/src/core/compiler

import { isArray } from '@vue-vapor/shared'
import { IRNodeTypes } from './ir'
import { newBlock } from './transforms/utils'
import { TransformContext } from './transforms'

import type { RootIRNode, RootNode, BlockIRNode } from './ir'
import type { NodeTransform, TransformOptions } from './transforms'

// AST (Babel) -> IR
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

export function transformNode(context: TransformContext<BlockIRNode['node']>): void {
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
