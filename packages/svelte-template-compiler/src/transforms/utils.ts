// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-vapor`
// Author: Evan you (https://github.com/yyx990803) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-vapor/src/transforms/utils.ts

import { createSimpleExpression, isLiteralWhitelisted } from '@vue-vapor/compiler-dom'
import { isGloballyAllowed, makeMap } from '@vue-vapor/shared'
import { DynamicFlag, IRNodeTypes } from '../ir/index.ts'

import type { BigIntLiteral, NumericLiteral, StringLiteral } from '@babel/types'
import type { SimpleExpressionNode } from '@vue-vapor/compiler-dom'
import type { BlockIRNode, IRDynamicInfo } from '../ir/index.ts'

export const isReservedProp: ReturnType<typeof makeMap> = /*#__PURE__*/ makeMap(
  // the leading comma is intentional so empty string "" is also included
  ',key,ref,ref_for,ref_key,'
)

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

export function resolveExpression(exp: SimpleExpressionNode): SimpleExpressionNode {
  if (!exp.isStatic) {
    const value = getLiteralExpressionValue(exp)
    if (value !== null) {
      return createSimpleExpression('' + value, true, exp.loc)
    }
  }
  return exp
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
