// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `unplugin-vue-jsx-vapor`
// Author: zhiyuanzmj (https://github.com/zhiyuanzmj) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/unplugin/unplugin-vue-jsx-vapor
// Code url: https://github.com/unplugin/unplugin-vue-jsx-vapor/tree/main/src/core/compiler

import { ErrorCodes, createCompilerError, resolveModifiers } from '@vue-vapor/compiler-dom'
import { extend, makeMap } from '@vue-vapor/shared'
import { IRNodeTypes } from '../ir/index.ts'
import {
  EMPTY_EXPRESSION,
  isComponentNode,
  resolveExpression,
  resolveLocation,
  resolveSimpleExpression
} from './utils.ts'

import type { KeyOverride, SetEventIRNode } from '../ir/index.ts'
import type { DirectiveTransform } from './types.ts'

const delegatedEvents = /*#__PURE__*/ makeMap(
  'beforeinput,click,dblclick,contextmenu,focusin,focusout,input,keydown,' +
    'keyup,mousedown,mousemove,mouseout,mouseover,mouseup,pointerdown,' +
    'pointermove,pointerout,pointerover,pointerup,touchend,touchmove,' +
    'touchstart'
)

export const transformOn: DirectiveTransform = (dir, node, context) => {
  const { name, loc, value } = dir
  if (name.type === 'JSXNamespacedName') {
    return
  }

  const isComponent = isComponentNode(node)

  const [nameString, ...modifiers] = name.name
    .replace(/^on([A-Z])/, (_, $1: string) => $1.toLowerCase())
    .split('_')

  if (!value && modifiers.length === 0) {
    context.options.onError(
      createCompilerError(ErrorCodes.X_V_ON_NO_EXPRESSION, resolveLocation(loc, context))
    )
  }

  let arg = resolveSimpleExpression(nameString, true, dir.name.loc)
  const exp = resolveExpression(dir.value, context)

  const { keyModifiers, nonKeyModifiers, eventOptionModifiers } = resolveModifiers(
    arg.isStatic ? `on${nameString}` : arg,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore -- TODO: fix this
    modifiers,
    null, // eslint-disable-line unicorn/no-null
    resolveLocation(loc, context)
  )

  let keyOverride: KeyOverride | undefined

  const isStaticClick = arg.isStatic && arg.content.toLowerCase() === 'click'
  const delegate = arg.isStatic && eventOptionModifiers.length === 0 && delegatedEvents(arg.content)

  // normalize click.right and click.middle since they don't actually fire

  if (nonKeyModifiers.includes('middle')) {
    if (keyOverride) {
      // TODO: error here
    }
    if (isStaticClick) {
      arg = extend({}, arg, { content: 'mouseup' })
    } else if (!arg.isStatic) {
      keyOverride = ['click', 'mouseup']
    }
  }

  if (nonKeyModifiers.includes('right')) {
    if (isStaticClick) {
      arg = extend({}, arg, { content: 'contextmenu' })
    } else if (!arg.isStatic) {
      keyOverride = ['click', 'contextmenu']
    }
  }

  if (isComponent) {
    const handler = exp || EMPTY_EXPRESSION
    return {
      key: arg,
      value: handler,
      handler: true
    }
  }

  const operation: SetEventIRNode = {
    type: IRNodeTypes.SET_EVENT,
    element: context.reference(),
    key: arg,
    value: exp,
    modifiers: {
      keys: keyModifiers,
      nonKeys: nonKeyModifiers,
      options: eventOptionModifiers
    },
    keyOverride,
    delegate,
    effect: !arg.isStatic
  }

  context.registerEffect([arg], operation)
}
