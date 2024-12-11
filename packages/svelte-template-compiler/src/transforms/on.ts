// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-vapor`
// Author: Evan you (https://github.com/yyx990803) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-vapor/src/transforms/vOn.ts

import { ErrorCodes, createCompilerError, resolveModifiers } from '@vue-vapor/compiler-dom'
import { extend, makeMap } from '@vue-vapor/shared'
import { IRNodeTypes, isSvelteElement } from '../ir/index.ts'
import { EMPTY_EXPRESSION, resolveExpression } from './utils.ts'

import type { KeyOverride, SetEventIRNode } from '../ir/index.ts'
import type { DirectiveTransform } from './types.ts'

const delegatedEvents = /*#__PURE__*/ makeMap(
  'beforeinput,click,dblclick,contextmenu,focusin,focusout,input,keydown,' +
    'keyup,mousedown,mousemove,mouseout,mouseover,mouseup,pointerdown,' +
    'pointermove,pointerout,pointerover,pointerup,touchend,touchmove,' +
    'touchstart'
)

export const transformOn: DirectiveTransform = (dir, node, context) => {
  const { exp, loc, modifiers } = dir
  const isComponent = isSvelteElement(node) && node.type === 'InlineComponent'
  // TODO:
  // const isSlotOutlet = node.tag === 'slot'
  const isSlotOutlet = false

  if (!exp && modifiers.length === 0) {
    context.options.onError(createCompilerError(ErrorCodes.X_V_ON_NO_EXPRESSION, loc))
  }
  let arg = resolveExpression(dir.arg!)

  const { keyModifiers, nonKeyModifiers, eventOptionModifiers } = resolveModifiers(
    arg.isStatic ? `on${arg.content}` : arg,
    modifiers,
    null, // eslint-disable-line unicorn/no-null
    loc
  )

  let keyOverride: KeyOverride | undefined
  const isStaticClick = arg.isStatic && arg.content.toLowerCase() === 'click'
  const delegate = arg.isStatic && eventOptionModifiers.length === 0 && delegatedEvents(arg.content)

  // normalize click.right and click.middle since they don't actually fire
  if (nonKeyModifiers.includes('middle')) {
    if (keyOverride) {
      // TODO error here
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

  if (isComponent || isSlotOutlet) {
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
