// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-vapor`
// Author: Evan you (https://github.com/yyx990803) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-vapor/src/transforms/vIf.ts

import { DynamicFlag, IRNodeTypes, isIfBlockOnElseBlock, isIfBlockOnTop } from '../ir/index.ts'
import { processChildren } from './children.ts'
import { newBlock, resolveSimpleExpression } from './utils.ts'

import type { BlockIRNode, IfIRNode, SvelteIfBlock, SvelteTemplateNode } from '../ir/index.ts'
import type { TransformContext } from './context.ts'
import type { NodeTransform } from './types.ts'

/**
 * transform vapor v-if for svelte {#if}
 * https://svelte.dev/docs/logic-blocks#if
 */
export const transformVIf: NodeTransform = (node, context) => {
  if (node.type === 'IfBlock' && !node.elseif) {
    return processIf(node as SvelteIfBlock, context as TransformContext<SvelteIfBlock>, [])
  }
}

export function processIf(
  node: SvelteIfBlock,
  context: TransformContext<SvelteIfBlock>,
  exitFns: (() => void)[],
  ifNode?: IfIRNode,
  vFor?: boolean
): (() => void)[] {
  let id = -1
  if (isIfBlockOnTop(node) && ifNode === undefined) {
    context.dynamic.flags |= DynamicFlag.NON_TEMPLATE | DynamicFlag.INSERT
    id = context.reference()
  }

  const condition = resolveSimpleExpression(node, context)
  if (vFor) {
    condition.content = `Array.from(${condition.content}).length`
  }
  const [positive, onExit] = createIfBranch(node, context)
  const operation: IfIRNode = {
    type: IRNodeTypes.IF,
    id,
    condition,
    positive,
    once: context.inVOnce
  }

  // set new BlockIRNode to negative
  if (isIfBlockOnElseBlock(node) && ifNode) {
    ifNode.negative = operation
  }

  // process children
  processChildren(node, context, true)

  exitFns.push(() => {
    onExit()
    if (isIfBlockOnTop(node)) {
      // if `#if` blocks is top, register operation
      context.registerOperation(operation)
    }
  })

  // process `:else if` or `:else` block
  if (node.else?.type === 'ElseBlock') {
    const ifBlock = node.else.children.find(child => child.type === 'IfBlock') as SvelteIfBlock
    if (ifBlock == undefined) {
      // for `:else` block
      const [negative, onExit] = createIfBranch(node.else, context)
      operation.negative = negative
      processChildren(node.else, context, true)
      exitFns.push(() => onExit())
    } else {
      // for `:else if` block
      return processIf(ifBlock, context, exitFns, operation)
    }
  }

  return exitFns
}

function createIfBranch(
  node: SvelteTemplateNode,
  context: TransformContext<SvelteTemplateNode>
): [BlockIRNode, () => void] {
  context.node = node // TODO: Should be wrapped?

  const branch: BlockIRNode = newBlock(node)
  const exitBlock = context.enterBlock(branch)
  context.reference()

  return [branch, exitBlock]
}
