// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-vapor`
// Author: Evan you (https://github.com/yyx990803) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-vapor/src/transforms/vModel.ts

import {
  createDOMCompilerError,
  createSimpleExpression,
  DOMErrorCodes,
  isMemberExpression
} from '@vue-vapor/compiler-dom'
import { findAttrs, IRNodeTypes } from '../ir/index.ts'

import type { VaporHelper } from '@vue-vapor/compiler-vapor'
import type { DirectiveTransform } from './types.ts'

// NOTE: transform vapor v-model from svelte some bindings
// https://v4.svelte.dev/docs/element-directives#bind-property
// https://v4.svelte.dev/docs/element-directives#binding-select-value
// ... and more on https://v4.svelte.dev/docs/element-directives

export const transformModel: DirectiveTransform = (dir, node, context) => {
  const { exp, arg } = dir
  if (!exp) {
    // TODO: should throw error on `onError`
    return
  }

  const expString = exp.content
  if (!expString.trim() || !isMemberExpression(exp, context.options)) {
    // TODO: should throw error on `onError`
    return
  }

  const isComponent = node.type === 'InlineComponent'
  if (isComponent) {
    return {
      // eslint-disable-next-line unicorn/prefer-logical-operator-over-ternary
      key: arg ? arg : createSimpleExpression('modelValue', true),
      value: exp,
      model: true,

      modelModifiers: dir.modifiers.map(m => m.content)
    }
  }

  if (dir.arg) {
    context.options.onError(
      createDOMCompilerError(DOMErrorCodes.X_V_MODEL_ARG_ON_ELEMENT, dir.arg.loc)
    )
  }

  const { name: tag } = node
  const isCustomElement = context.options.isCustomElement(tag)

  let runtimeDirective: VaporHelper | undefined = 'vModelText'
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || isCustomElement) {
    if (tag === 'input' || isCustomElement) {
      const typeAttr = findAttrs(node, 'type')
      if (typeAttr) {
        const value = (typeAttr.value as { type: string; data: string; raw: string }[]).find(
          v => v.type === 'Text'
        )
        if (value) {
          switch (value.data) {
            case 'checkbox': {
              runtimeDirective = 'vModelCheckbox'
              break
            }
            case 'radio': {
              runtimeDirective = 'vModelRadio'
              break
            }
            case 'file': {
              // TODO: should support
              // runtimeDirective = 'vModelFile'
              break
            }
          }
        }
      }
    } else if (tag === 'select') {
      runtimeDirective = 'vModelSelect'
    } else {
      // other ...
      // TODO:
    }
  } else {
    // TODO:
  }

  context.registerOperation({
    type: IRNodeTypes.SET_MODEL_VALUE,
    element: context.reference(),
    key: arg || createSimpleExpression('modelValue', true),
    value: exp,
    isComponent
  })

  if (runtimeDirective) {
    context.registerOperation({
      type: IRNodeTypes.WITH_DIRECTIVE,
      element: context.reference(),
      dir,
      name: runtimeDirective,
      builtin: true
    })
  }
}
