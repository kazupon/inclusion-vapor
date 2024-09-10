// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-vapor`
// Author: Evan you (https://github.com/yyx990803) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-vapor/src/transforms/.ts

import { DynamicFlag, IRNodeTypes } from '../ir/index.ts'
import { processChildren } from './transformChildren.ts'
import { newBlock, resolveSimpleExpression } from './utils.ts'

import type { BlockIRNode, SvelteIfBlock, SvelteTemplateNode } from '../ir/index.ts'
import type { TransformContext } from './context.ts'
import type { NodeTransform } from './types.ts'

/**
 * transform vapor v-if for svelte {#if}
 * https://svelte.dev/docs/logic-blocks#if
 */
export const transformVIf: NodeTransform = (node, context) => {
  if (node.type === 'IfBlock' && !node.elseif) {
    return processIf(node as SvelteIfBlock, context as TransformContext<SvelteIfBlock>)
  }
}

function processIf(
  node: SvelteIfBlock,
  context: TransformContext<SvelteIfBlock>
): (() => void)[] | undefined {
  const exitFns: (() => void)[] = []

  if (node.type === 'IfBlock' && !node.elseif) {
    context.dynamic.flags |= DynamicFlag.NON_TEMPLATE | DynamicFlag.INSERT
    const id = context.reference()
    const condition = resolveSimpleExpression(node, context)
    const [branch, onExit] = createIfBranch(
      node as SvelteTemplateNode,
      context as TransformContext<SvelteTemplateNode>
    )

    processChildren(
      node as SvelteTemplateNode,
      context as TransformContext<SvelteTemplateNode>,
      true
    )

    exitFns.push(() => {
      onExit()
      context.registerOperation({
        type: IRNodeTypes.IF,
        id,
        condition,
        positive: branch,
        once: context.inVOnce
      })
    })
  }

  return exitFns
}

function createIfBranch(
  node: SvelteTemplateNode,
  context: TransformContext<SvelteTemplateNode>
): [BlockIRNode, () => void] {
  context.node = node // TODO: Shuld be wrapped?

  const branch: BlockIRNode = newBlock(node)
  const exitBlock = context.enterBlock(branch)
  context.reference()

  return [branch, exitBlock]
}
