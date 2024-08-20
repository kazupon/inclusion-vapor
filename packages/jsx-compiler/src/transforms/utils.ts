// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `unplugin-vue-jsx-vapor`
// Author: zhiyuanzmj (https://github.com/zhiyuanzmj) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/unplugin/unplugin-vue-jsx-vapor
// Code url: https://github.com/unplugin/unplugin-vue-jsx-vapor/tree/main/src/core/compiler

import { parseExpression } from '@babel/parser'
import { isString } from '@vue-vapor/shared'
import { isLiteralWhitelisted, createSimpleExpression } from '@vue-vapor/compiler-dom'
import { isGloballyAllowed } from '@vue-vapor/shared'
import { tags as htmlTags } from '../htmlTags'
import { tags as svgTags } from '../svgTags'
import { DynamicFlag, IRNodeTypes } from '../ir'

import type { BigIntLiteral, NumericLiteral, StringLiteral } from '@babel/types'
import type { ParseResult } from '@babel/parser'
import type { SimpleExpressionNode, SourceLocation } from '@vue-vapor/compiler-dom'
import type { HtmlTags } from '../htmlTags'
import type { SvgTags } from '../svgTags'
import type {
  IRDynamicInfo,
  BlockIRNode,
  JSXElement,
  BabelNode,
  BabelCallExpression,
  BabelExpression,
  BabelSourceLocation
} from '../ir'
import type { TransformContext } from './context'

export const EMPTY_EXPRESSION: ReturnType<typeof createSimpleExpression> = createSimpleExpression(
  '',
  true
)

export const newDynamic = (): IRDynamicInfo => ({
  flags: DynamicFlag.REFERENCED,
  children: []
})

export const newBlock = (node: BlockIRNode['node']): BlockIRNode => ({
  type: IRNodeTypes.BLOCK,
  node,
  dynamic: newDynamic(),
  effect: [],
  operation: [],
  returns: []
})

export function isConstantExpression(exp: SimpleExpressionNode): boolean {
  return (
    isLiteralWhitelisted(exp.content) ||
    isGloballyAllowed(exp.content) ||
    getLiteralExpressionValue(exp) !== null
  )
}

export function getLiteralExpressionValue(
  exp: SimpleExpressionNode
): number | string | boolean | null {
  if (!__BROWSER__ && exp.ast) {
    if (['StringLiteral', 'NumericLiteral', 'BigIntLiteral'].includes(exp.ast.type)) {
      return (exp.ast as StringLiteral | NumericLiteral | BigIntLiteral).value
    } else if (exp.ast.type === 'TemplateLiteral' && exp.ast.expressions.length === 0) {
      return exp.ast.quasis[0].value.cooked!
    }
  }
  // eslint-disable-next-line unicorn/no-null
  return exp.isStatic ? exp.content : null
}

export function resolveExpression(
  node: BabelNode | undefined | null,
  context: TransformContext
): SimpleExpressionNode {
  const isStatic =
    !!node &&
    (node.type === 'StringLiteral' || node.type === 'JSXText' || node.type === 'JSXIdentifier')
  const source = node
    ? node.type === 'JSXIdentifier'
      ? node.name
      : // eslint-disable-next-line unicorn/no-nested-ternary
        isStatic
        ? node.value
        : node.type === 'JSXExpressionContainer'
          ? node.expression.type === 'Identifier'
            ? node.expression.name
            : context.ir.source.slice(node.expression.start!, node.expression.end!)
          : context.ir.source.slice(node.start!, node.end!)
    : ''

  const location = node ? node.loc : null // eslint-disable-line unicorn/no-null
  let ast: false | ParseResult<BabelExpression> = false
  if (!isStatic && context.options.prefixIdentifiers) {
    ast = parseExpression(` ${source}`, {
      sourceType: 'module',
      plugins: context.options.expressionPlugins
    })
  }

  return resolveSimpleExpression(source, isStatic, location, ast)
}

export function resolveSimpleExpression(
  source: string,
  isStatic: boolean,
  location?: BabelSourceLocation | null,
  ast?: false | ParseResult<BabelExpression>
): SimpleExpressionNode {
  const result = createSimpleExpression(source, isStatic, resolveLocation(location, source))
  result.ast = ast ?? null // eslint-disable-line unicorn/no-null
  return result
}

export function resolveLocation(
  location: BabelSourceLocation | null | undefined,
  context: TransformContext | string
): SourceLocation {
  return location
    ? {
        start: {
          line: location.start.line,
          column: location.start.column + 1,
          offset: location.start.index
        },
        end: {
          line: location.end.line,
          column: location.end.column + 1,
          offset: location.end.index
        },
        source: isString(context)
          ? context
          : context.ir.source.slice(location.start.index, location.end.index)
      }
    : {
        start: { line: 1, column: 1, offset: 0 },
        end: { line: 1, column: 1, offset: 0 },
        source: ''
      }
}

export function isComponentNode(node: BabelNode): node is JSXElement {
  if (node.type !== 'JSXElement') {
    return false
  }

  const { openingElement } = node
  if (openingElement.name.type === 'JSXIdentifier') {
    const name = openingElement.name.name
    return !htmlTags.includes(name as HtmlTags) && !svgTags.includes(name as SvgTags)
  } else {
    return openingElement.name.type === 'JSXMemberExpression'
  }
}

export function isMapCallExpression(node?: BabelNode | null): node is BabelCallExpression {
  return (
    !!node &&
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'map'
  )
}
