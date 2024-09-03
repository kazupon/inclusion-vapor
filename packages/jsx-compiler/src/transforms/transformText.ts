// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `unplugin-vue-jsx-vapor`
// Author: zhiyuanzmj (https://github.com/zhiyuanzmj) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/unplugin/unplugin-vue-jsx-vapor
// Code url: https://github.com/unplugin/unplugin-vue-jsx-vapor/tree/main/src/core/compiler

import { DynamicFlag, IRNodeTypes } from '../ir/index.ts'
// import { processConditionalExpression, processLogicalExpression } from './vIf'
// import { processMapCallExpression } from './vFor'
import {
  getLiteralExpressionValue,
  isComponentNode,
  isConstantExpression,
  isMapCallExpression,
  resolveExpression
} from './utils.ts'

import type {
  BabelCallExpression,
  BabelNode,
  BlockIRNode,
  JSXElement,
  JSXExpressionContainer,
  JSXText,
  RootNode
} from '../ir/index.ts'
import type { TransformContext } from './context.ts'
import type { NodeTransform } from './types.ts'

type TextLike = JSXText | JSXExpressionContainer

const seen = new WeakMap<
  TransformContext<RootNode>,
  WeakSet<TextLike | BlockIRNode['node'] | RootNode>
>()

export const transformText: NodeTransform = (node, context) => {
  if (!seen.has(context.root)) {
    seen.set(context.root, new WeakSet())
  }

  if (seen.get(context.root)!.has(node)) {
    context.dynamic.flags |= DynamicFlag.NON_TEMPLATE
    return
  }

  if (
    node.type === 'JSXElement' &&
    !isComponentNode(node) &&
    // @ts-expect-error -- FIXME
    isAllTextLike(node.children) // eslint-disable-line @typescript-eslint/no-unsafe-argument
  ) {
    processTextLikeContainer(
      // @ts-expect-error -- FIXME
      node.children, // eslint-disable-line @typescript-eslint/no-unsafe-argument
      context as TransformContext<JSXElement>
    )
  } else if (node.type === 'JSXExpressionContainer') {
    switch (node.expression.type) {
      // case 'ConditionalExpression': {
      //   return processConditionalExpression(node.expression, context)
      // }
      // case 'LogicalExpression': {
      //   return processLogicalExpression(node.expression, context)
      // }
      case 'CallExpression': {
        if (isMapCallExpression(node.expression)) {
          // return processMapCallExpression(node.expression, context)
        } else {
          processCallExpression(node.expression, context)
        }

        break
      }
      default: {
        processTextLike(context as TransformContext<JSXExpressionContainer>)
      }
    }
  } else if (node.type === 'JSXText') {
    context.template += node.value
  }
}

function processTextLike(context: TransformContext<JSXExpressionContainer>) {
  const nexts = context.parent!.node.children?.slice(context.index)
  const idx = nexts.findIndex(n => !isTextLike(n))
  const nodes = (idx > -1 ? nexts.slice(0, idx) : nexts) as Array<TextLike>

  const id = context.reference()
  const values = nodes.map(node => createTextLikeExpression(node, context))

  context.dynamic.flags |= DynamicFlag.INSERT | DynamicFlag.NON_TEMPLATE

  context.registerOperation({
    type: IRNodeTypes.CREATE_TEXT_NODE,
    id,
    values,
    // eslint-disable-next-line unicorn/no-array-callback-reference
    effect: !values.every(isConstantExpression) && !context.inVOnce
  })
}

function processTextLikeContainer(children: TextLike[], context: TransformContext<JSXElement>) {
  const values = children.map(child => createTextLikeExpression(child, context))
  const literals = values.map(getLiteralExpressionValue) // eslint-disable-line unicorn/no-array-callback-reference
  if (literals.every(l => l != undefined)) {
    context.childrenTemplate = literals.map(String)
  } else {
    context.registerEffect(values, {
      type: IRNodeTypes.SET_TEXT,
      element: context.reference(),
      values
    })
  }
}

function createTextLikeExpression(node: TextLike, context: TransformContext) {
  seen.get(context.root)!.add(node)
  return resolveExpression(node, context)
}

function isAllTextLike(children: BabelNode[]): children is TextLike[] {
  return (
    children.length > 0 &&
    // eslint-disable-next-line unicorn/no-array-callback-reference
    children.every(isTextLike) &&
    // at least one an interpolation
    children.some(n => n.type === 'JSXExpressionContainer')
  )
}

function isTextLike(node: BabelNode): node is TextLike {
  return (
    (node.type === 'JSXExpressionContainer' &&
      !(
        node.expression.type === 'ConditionalExpression' ||
        node.expression.type === 'LogicalExpression'
      ) &&
      node.expression.type !== 'CallExpression') ||
    node.type === 'JSXText'
  )
}

function processCallExpression(node: BabelCallExpression, context: TransformContext) {
  context.dynamic.flags |= DynamicFlag.NON_TEMPLATE | DynamicFlag.INSERT
  const root = context.root === context.parent && context.parent.node.children.length === 1
  const tag = `() => ${context.ir.source.slice(node.start!, node.end!)}`

  context.registerOperation({
    type: IRNodeTypes.CREATE_COMPONENT_NODE,
    id: context.reference(),
    tag,
    props: [],
    asset: false,
    root,
    slots: context.slots,
    once: context.inVOnce
  })
}
