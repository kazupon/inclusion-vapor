// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-vapor`
// Author: Evan you (https://github.com/yyx990803) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-vapor/src/transforms/transformSlotOutlet.ts

import { createSimpleExpression } from '@vue-vapor/compiler-dom'
import { camelize, extend } from '@vue-vapor/shared'
import {
  convertVaporDirectiveExpression,
  DynamicFlag,
  IRNodeTypes,
  isSvelteAttribute,
  isSvelteDirective,
  isSvelteElement,
  isSvelteSpreadAttribute
} from '../ir/index.ts'
import { buildProps } from './element.ts'
import { newBlock } from './utils.ts'

import type { SimpleExpressionNode } from '@vue-vapor/compiler-dom'
import type {
  BlockIRNode,
  IRProps,
  SvelteAttribute,
  SvelteBaseDirective,
  SvelteElement,
  SvelteSpreadAttribute,
  WithDirectiveIRNode
} from '../ir/index.ts'
import type { TransformContext } from './context.ts'
import type { NodeTransform } from './types.ts'

// TODO: transform vapor slot from svelte slot
// https://svelte.dev/docs/special-elements#slot
export const transformSlotOutlet: NodeTransform = (node, context) => {
  if (node.type !== 'Slot') {
    return
  }
  const { parent } = context
  if (parent && isSvelteElement(parent.node) && parent.node.type === 'InlineComponent') {
    return
  }

  const id = context.reference()
  context.dynamic.flags |= DynamicFlag.INSERT | DynamicFlag.NON_TEMPLATE
  const [fallback, exitBlock] = createFallback(
    node as SvelteElement,
    context as TransformContext<SvelteElement>
  )

  let slotName: SimpleExpressionNode | undefined
  const slotProps: (SvelteAttribute | SvelteSpreadAttribute)[] = []
  for (const attr of node.attributes as (
    | SvelteAttribute
    | SvelteSpreadAttribute
    | SvelteBaseDirective
  )[]) {
    if (isSvelteAttribute(attr)) {
      if (attr.name === 'name') {
        slotName = convertVaporDirectiveExpression(attr, { isStatic: true })
      } else {
        slotProps.push(extend({}, attr, { name: camelize(attr.name) }))
      }
    } else if (isSvelteSpreadAttribute(attr)) {
      slotProps.push(extend({}, attr))
    } else if (isSvelteDirective(attr)) {
      // TODO:
    } else {
      slotName = undefined
    }
  }

  slotName ||= createSimpleExpression('default', true)
  let irProps: IRProps[] = []
  if (slotProps.length > 0) {
    const [isDynamic, props] = buildProps(
      extend({}, node as SvelteElement, { attributes: slotProps }),
      context as TransformContext<SvelteElement>,
      true
    )
    irProps = isDynamic ? props : [props]

    const runtimeDirective = context.block.operation.find(
      (ope): ope is WithDirectiveIRNode =>
        ope.type === IRNodeTypes.WITH_DIRECTIVE && ope.element === id
    )
    if (runtimeDirective) {
      // TODO:
      // context.options.onError(
      //   createCompilerError(
      //     ErrorCodes.X_V_SLOT_UNEXPECTED_DIRECTIVE_ON_SLOT_OUTLET,
      //     runtimeDirective.dir.loc,
      //   ),
      // )
    }
  }

  return () => {
    exitBlock?.()
    context.registerOperation({
      type: IRNodeTypes.SLOT_OUTLET_NODE,
      id,
      name: slotName,
      props: irProps,
      fallback
    })
  }
}

function createFallback(
  node: SvelteElement,
  context: TransformContext<SvelteElement>
): [block?: BlockIRNode, exit?: () => void] {
  const children = node.children || []
  if (children.length === 0) {
    return []
  }

  context.node = node = extend({}, node)

  const fallback = newBlock(node)
  const exitBlock = context.enterBlock(fallback)
  context.reference()

  return [fallback, exitBlock]
}
