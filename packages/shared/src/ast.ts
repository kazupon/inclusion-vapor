// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)

import { isLiteralWhitelisted } from '@vue-vapor/compiler-dom'
import { DynamicFlag } from '@vue-vapor/compiler-vapor'
import { isGloballyAllowed } from '@vue-vapor/shared'

import type { BigIntLiteral, NumericLiteral, StringLiteral } from '@babel/types'
import type { SimpleExpressionNode } from '@vue-vapor/compiler-dom'
import type { IRDynamicInfo } from '@vue-vapor/compiler-vapor'

export function newDynamic(): IRDynamicInfo {
  return {
    flags: DynamicFlag.REFERENCED,
    children: []
  }
}

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
