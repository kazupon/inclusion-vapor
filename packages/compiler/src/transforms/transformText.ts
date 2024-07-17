// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-vapor`
// Author: Evan you (https://github.com/yyx990803) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-vapor/src/transforms/transformText.ts

import { createSimpleExpression } from '@vue-vapor/compiler-dom'
import { isString } from '@vue-vapor/shared'
import { parseExpression } from '@babel/parser'
import {
  DynamicFlag,
  IRNodeTypes,
  isSvelteElement,
  isSvelteText,
  isSvelteMustacheTag,
  convertToSourceLocation
} from '../ir'
import { isConstantExpression, getLiteralExpressionValue } from './utils'

import type { SimpleExpressionNode } from '@vue-vapor/compiler-dom'
import type { ParseResult as BabelParseResult } from '@babel/parser'
import type { Expression as BabelExpression } from '@babel/types'
import type { TransformContext } from './context'
import type { NodeTransform } from './types'
import type {
  SvelteTemplateNode,
  RootNode,
  SvelteElement,
  SvelteText,
  SvelteMustacheTag
} from '../ir'

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

function resolveSimpleExpression<T extends SvelteMustacheTag>(
  node: SvelteMustacheTag,
  context: TransformContext<T>
): SimpleExpressionNode {
  const { expression } = node

  const content =
    expression.type === 'Identifier'
      ? expression.name
      : (expression.type === 'Literal'
        ? expression.raw || ''
        : context.ir.source.slice(node.start, node.end))
  const loc = expression.loc || convertToSourceLocation(node, content) // FIXME: twaeak loc type

  let ast: false | BabelParseResult<BabelExpression> = false
  const isStatic =
    expression.type === 'Identifier'
      ? false
      : expression.type === 'Literal' && !isString(expression.value)
  if (!isStatic && context.options.prefixIdentifiers) {
    ast = parseExpression(`${content}`, {
      sourceType: 'module',
      plugins: context.options.expressionPlugins
    })
  }

  const exp = createSimpleExpression(
    content,
    isStatic,
    loc as ReturnType<typeof convertToSourceLocation>
  )
  exp.ast = ast ?? null // eslint-disable-line unicorn/no-null
  return exp
}

function isAllTextLike(children: SvelteTemplateNode[]): children is TextLike[] {
  return (
    children.length > 0 &&
    // eslint-disable-next-line unicorn/no-array-callback-reference
    children.every(isTextLike) &&
    // at least one an mustache tag
    children.some(n => n.type === 'MustacheTag')
  )
}

function isTextLike(node: SvelteTemplateNode): node is TextLike {
  // TODO: should more tested for MustacheTag expression
  // e.g. ConditionalExpression, LogicalExpression and CallExpression ...
  return isSvelteText(node) || isSvelteMustacheTag(node)
}
