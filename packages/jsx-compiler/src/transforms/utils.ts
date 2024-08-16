// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `unplugin-vue-jsx-vapor`
// Author: zhiyuanzmj (https://github.com/zhiyuanzmj) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/unplugin/unplugin-vue-jsx-vapor
// Code url: https://github.com/unplugin/unplugin-vue-jsx-vapor/tree/main/src/core/compiler

import { isLiteralWhitelisted } from '@vue-vapor/compiler-dom'
import { isGloballyAllowed } from '@vue-vapor/shared'
import { DynamicFlag, IRNodeTypes } from '../ir'

import type { BigIntLiteral, NumericLiteral, StringLiteral } from '@babel/types'
import type { SimpleExpressionNode } from '@vue-vapor/compiler-dom'
import type { IRDynamicInfo, BlockIRNode } from '../ir'

export function newDynamic(): IRDynamicInfo {
  return {
    flags: DynamicFlag.REFERENCED,
    children: []
  }
}

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
