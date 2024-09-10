// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-vapor`
// Author: Evan you (https://github.com/yyx990803) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-vapor/src/transforms/transformText.ts

import { createSimpleExpression } from '@vue-vapor/compiler-dom'
import {
  convertToSourceLocation,
  DynamicFlag,
  IRNodeTypes,
  isSvelteElement,
  isSvelteMustacheTag,
  isSvelteText
} from '../ir/index.ts'
import {
  getLiteralExpressionValue,
  isConstantExpression,
  resolveSimpleExpression
} from './utils.ts'

import type { SimpleExpressionNode } from '@vue-vapor/compiler-dom'
import type {
  RootNode,
  SvelteElement,
  SvelteMustacheTag,
  SvelteTemplateNode,
  SvelteText
} from '../ir/index.ts'
import type { TransformContext } from './context.ts'
import type { NodeTransform } from './types.ts'

type TextLike = SvelteText | SvelteMustacheTag

const seen = new WeakMap<TransformContext<RootNode>, WeakSet<SvelteTemplateNode | RootNode>>()

export const transformText: NodeTransform = (node, context) => {
  if (!seen.has(context.root)) {
    seen.set(context.root, new WeakSet())
  }

  if (seen.get(context.root)!.has(node)) {
    context.dynamic.flags |= DynamicFlag.NON_TEMPLATE
    return
  }

  const children = node.children || []
  if (isSvelteElement(node) && isAllTextLike(children)) {
    // TODO: should more tested for component
    processTextLikeContainer(children, context as TransformContext<SvelteElement>)
  } else if (isSvelteMustacheTag(node)) {
    // TODO: should more tested for MustacheTag expression
    // e.g. ConditionalExpression, LogicalExpression and CallExpression ...
    processTextLike(context as TransformContext<SvelteMustacheTag>)
  } else if (isSvelteText(node)) {
    context.template += node.data
  }
}

function processTextLike(context: TransformContext<SvelteMustacheTag>): void {
  const children = context.parent!.node.children || []
  const nexts = children.slice(context.index)
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

function processTextLikeContainer(
  children: TextLike[],
  context: TransformContext<SvelteElement>
): void {
  const values = children.map(child => createTextLikeExpression(child, context))
  // eslint-disable-next-line unicorn/no-array-callback-reference
  const literals = values.map(getLiteralExpressionValue)
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

function createTextLikeExpression(node: TextLike, context: TransformContext): SimpleExpressionNode {
  seen.get(context.root)!.add(node)
  // prettier-ignore
  return isSvelteText(node)
    ? createSimpleExpression(node.data, true, convertToSourceLocation(node, (node as unknown as { raw: string }).raw || node.data))
    : resolveSimpleExpression(node, context as TransformContext<SvelteMustacheTag>)
}

function isAllTextLike(children: SvelteTemplateNode[]): children is TextLike[] {
  return (
    children.length > 0 &&
    // eslint-disable-next-line unicorn/no-array-callback-reference
    children.every(isTextLike) &&
    // at least one an mustache tag
    children.some(n => isSvelteMustacheTag(n))
  )
}

function isTextLike(node: SvelteTemplateNode): node is TextLike {
  // TODO: should more tested for MustacheTag expression
  // e.g. ConditionalExpression, LogicalExpression and CallExpression ...
  return isSvelteText(node) || isSvelteMustacheTag(node)
}
