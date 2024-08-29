// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `unplugin-vue-jsx-vapor`
// Author: zhiyuanzmj (https://github.com/zhiyuanzmj) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/unplugin/unplugin-vue-jsx-vapor
// Code url: https://github.com/unplugin/unplugin-vue-jsx-vapor/tree/main/src/core/compiler

import { camelize, extend } from '@vue-vapor/shared'
import { resolveExpression, resolveSimpleExpression } from './utils'
import { isReservedProp } from './transformElement'

import type { DirectiveTransform } from './types'

export const transformVBind: DirectiveTransform = (dir, _node, context) => {
  const { name, value, loc } = dir
  if (!loc || name.type === 'JSXNamespacedName') {
    return
  }

  const [nameString, ...modifiers] = name.name.split('_')

  const exp = resolveExpression(value, context)
  let arg = resolveSimpleExpression(nameString, true, dir.name.loc)

  if (arg.isStatic && isReservedProp(arg.content)) {
    return
  }

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
