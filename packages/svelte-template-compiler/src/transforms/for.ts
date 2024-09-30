// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-vapor`
// Author: Evan you (https://github.com/yyx990803) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-vapor/src/transforms/vFor.ts

import { createSimpleExpression } from '@vue-vapor/compiler-dom'
import { extend } from '@vue-vapor/shared'
import {
  convertToSourceLocation,
  DynamicFlag,
  IRNodeTypes,
  isSvelteElseBlock
} from '../ir/index.ts'
import { processChildren } from './children.ts'
import { processIf } from './if.ts'
import { newBlock, parseBabelExpression, resolveSimpleExpression } from './utils.ts'

import type { SimpleExpressionNode } from '@vue-vapor/compiler-dom'
import type {
  BlockIRNode,
  CompatLocationable,
  SvelteBaseNode,
  SvelteEachBlock,
  SvelteIfBlock,
  SvelteTemplateNode
} from '../ir/index.ts'
import type { TransformContext } from './context.ts'
import type { NodeTransform } from './types.ts'

/**
 * NOTE: transform vapor v-for from svelte {#each}
 * https://svelte.dev/docs/logic-blocks#each
 */
export const transformVFor: NodeTransform = (node, context) => {
  if (__DEV__) {
    console.log('transformVFor', node.type, context.parent?.node.type)
  }

  if (node.type === 'EachBlock') {
    // TODO:
    // check if the node has slot attribute or slot fallback contents.
    // if it has, skip the {#each} block transformation.
    // because the slot attribute or slot fallback contents will be transformed by `transformVSlot`.
    // const hasSlot = hasSlotAttrOrSlotFallbackContents(node as SvelteEachBlock)
    // if (hasSlot) {
    //   return
    // }

    // eslint-disable-next-line unicorn/no-negated-condition
    if (!isSvelteElseBlock(node.else)) {
      return processFor(node as SvelteEachBlock, context as TransformContext<SvelteEachBlock>, [])
    } else {
      // re-structure node with `#if` and `:else` block
      const elseNode = extend({}, node.else)
      node.else = undefined
      const ifNode = extend({}, node, {
        type: 'IfBlock',
        children: [node],
        context: undefined,
        index: undefined,
        key: undefined,
        else: elseNode
      })

      return processIf(
        ifNode as unknown as SvelteIfBlock,
        context as TransformContext<SvelteIfBlock>,
        [],
        undefined,
        true
      )
    }
  }
}

// TODO:
// function hasSlotAttrOrSlotFallbackContents(node: SvelteEachBlock): boolean {
//   const components = node.children.filter(child => child.type === 'InlineComponent')
//   if (components.length === 0) {
//     return false
//   }
//   return components.some(component => findAttrs(component, 'slot') || (component.children || []).length > 0)
// }

function processFor(
  node: SvelteEachBlock,
  context: TransformContext<SvelteEachBlock>,
  exitFns: (() => void)[]
): (() => void)[] {
  const source = resolveForSource(node, context)
  const value = resolveForValue(node, context)
  const index = resolveForIndex(node, context)
  const key = resolveForKey(node, context)
  const keyProp = resolveForKeyProp(node, context)

  context.dynamic.flags |= DynamicFlag.NON_TEMPLATE | DynamicFlag.INSERT
  const id = context.reference()
  const [render, onExit] = createForRender(node, context)

  // process children
  processChildren(node, context, true)

  exitFns.push(() => {
    onExit()
    context.registerOperation({
      type: IRNodeTypes.FOR,
      id,
      source,
      value,
      key,
      index,
      keyProp,
      render,
      once: context.inVOnce
    })
  })

  return exitFns
}

function resolveForValue(
  node: SvelteEachBlock,
  context: TransformContext
): SimpleExpressionNode | undefined {
  const base = node as SvelteBaseNode
  const isStatic = false
  const content = context.ir.source.slice(
    (node.context as unknown as { start: number }).start,
    (node.context as unknown as { end: number }).end
  )
  // FIXME: resolve correct location from svelte AST (We need to extend svelte AST for location)
  const loc =
    node.context.loc == undefined
      ? convertToSourceLocation(base, content)
      : convertToSourceLocation(node.context.loc as CompatLocationable, content)

  const exp = createSimpleExpression(content, isStatic, loc)

  const ast = parseBabelExpression(content, isStatic, context)
  exp.ast = ast ?? null // eslint-disable-line unicorn/no-null

  return exp
}

function resolveForIndex(
  node: SvelteEachBlock,
  context: TransformContext
): SimpleExpressionNode | undefined {
  if (node.index) {
    const content = node.index
    const isStatic = false

    // FIXME: resolve correct location from svelte AST (We need to extend svelte AST for location)
    const loc = convertToSourceLocation(node, content)
    const exp = createSimpleExpression(content, isStatic, loc)

    const ast = parseBabelExpression(content, isStatic, context)
    exp.ast = ast ?? null // eslint-disable-line unicorn/no-null

    return exp
  }
}

function resolveForKey(
  _node: SvelteEachBlock,
  _context: TransformContext
): SimpleExpressionNode | undefined {
  // TODO:
  return
}

function resolveForKeyProp(
  node: SvelteEachBlock,
  context: TransformContext
): SimpleExpressionNode | undefined {
  if (node.key) {
    const isStatic = false
    let loc = undefined
    let content = ''
    // TODO: should support for more node type cases (should use source.slice)
    switch (node.key.type) {
      case 'Identifier': {
        content = context.ir.source.slice(
          (node.key as unknown as { start: number }).start,
          (node.key as unknown as { end: number }).end
        )
        // FIXME: resolve correct location from svelte AST (We need to extend svelte AST for location)
        loc = convertToSourceLocation(node.key as unknown as CompatLocationable, content)
        break
      }
      case 'MemberExpression': {
        content = context.ir.source.slice(
          (node.key as unknown as { start: number }).start,
          (node.key as unknown as { end: number }).end
        )
        // FIXME: resolve correct location from svelte AST (We need to extend svelte AST for location)
        loc = convertToSourceLocation(node.key.loc as CompatLocationable, content)
        break
      }
    }

    const exp = createSimpleExpression(
      content,
      isStatic,
      loc as ReturnType<typeof convertToSourceLocation>
    )

    const ast = parseBabelExpression(content, isStatic, context)
    exp.ast = ast ?? null // eslint-disable-line unicorn/no-null

    return exp
  }
}

function resolveForSource(
  node: SvelteEachBlock,
  context: TransformContext<SvelteEachBlock>
): SimpleExpressionNode {
  return resolveSimpleExpression(node, context)
}

function createForRender(
  node: SvelteTemplateNode,
  context: TransformContext<SvelteTemplateNode>
): [BlockIRNode, () => void] {
  context.node = node // TODO: should be wrapped?

  const render: BlockIRNode = newBlock(node)
  const exitBlock = context.enterBlock(render, true)
  context.reference()

  return [render, exitBlock]
}
