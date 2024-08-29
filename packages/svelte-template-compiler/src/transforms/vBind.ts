// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-vapor`
// Author: Evan you (https://github.com/yyx990803) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-vapor/src/transforms/vBind.ts

import {
  ErrorCodes,
  NodeTypes,
  createCompilerError,
  createSimpleExpression
} from '@vue-vapor/compiler-dom'
import { camelize, extend } from '@vue-vapor/shared'
import { resolveExpression, isReservedProp } from './utils'

import type { SimpleExpressionNode } from '@vue-vapor/compiler-dom'
import type { TransformContext } from './context'
import type { DirectiveTransform } from './types'

// same-name shorthand - :arg is expanded to :arg="arg"
export function normalizeBindShorthand(
  arg: SimpleExpressionNode,
  context: TransformContext
): SimpleExpressionNode {
  if (arg.type !== NodeTypes.SIMPLE_EXPRESSION || !arg.isStatic) {
    // only simple expression is allowed for same-name shorthand
    context.options.onError(
      createCompilerError(ErrorCodes.X_V_BIND_INVALID_SAME_NAME_ARGUMENT, arg.loc)
    )
    return createSimpleExpression('', true, arg.loc)
  }

  const propName = camelize(arg.content)
  const exp = createSimpleExpression(propName, false, arg.loc)
  exp.ast = null // eslint-disable-line unicorn/no-null
  return exp
}

export const transformVBind: DirectiveTransform = (dir, _node, context) => {
  const { loc, modifiers } = dir
  let { exp } = dir
  let arg = dir.arg!

  if (!exp) exp = normalizeBindShorthand(arg, context)
  if (!exp.content.trim()) {
    if (!__BROWSER__) {
      // #10280 only error against empty expression in non-browser build
      // because :foo in in-DOM templates will be parsed into :foo="" by the
      // browser
      context.options.onError(createCompilerError(ErrorCodes.X_V_BIND_NO_EXPRESSION, loc))
    }
    exp = createSimpleExpression('', true, loc)
  }

  exp = resolveExpression(exp)
  arg = resolveExpression(arg)

  if (arg.isStatic && isReservedProp(arg.content)) return

  let camel = false
  if (modifiers.includes('camel')) {
    if (arg.isStatic) {
      arg = extend({}, arg, { content: camelize(arg.content) })
    } else {
      camel = true
    }
  }

  return {
    key: arg,
    value: exp,
    loc,
    runtimeCamelize: camel,
    modifier: modifiers.includes('prop') ? '.' : modifiers.includes('attr') ? '^' : undefined
  }
}
