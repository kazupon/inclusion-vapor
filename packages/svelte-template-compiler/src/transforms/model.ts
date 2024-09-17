// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-vapor`
// Author: Evan you (https://github.com/yyx990803) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-vapor/src/transforms/vModel.ts

import { BindingTypes, createSimpleExpression, isMemberExpression } from '@vue-vapor/compiler-dom'
import { IRNodeTypes } from '../ir/index.ts'
import { getExpSource } from './utils.ts'

import type { VaporHelper } from '@vue-vapor/compiler-vapor'
import type { DirectiveTransform } from './types.ts'

// TODO: transform vapor v-model from svelte some bindings
// https://svelte.dev/docs/element-directives#bind-property
// https://svelte.dev/docs/element-directives#binding-select-value
// ... and more on https://svelte.dev/docs/element-directives
export const transformVModel: DirectiveTransform = (dir, node, context) => {
  console.log('transformVModel', dir, node)

  const { exp, arg } = dir
  if (!exp) {
    // TODO: should throw error on `onError`
    return
  }

  // we assume v-model directives are always parsed
  // (not artificially created by a transform)
  const rawExp = exp.loc.source
  console.log('rawExp', rawExp)
  console.log('bindingMetadata', context.options.bindingMetadata)

  // TODO: do we need to handle from `bindingMetadata`?
  const bindingType = (context.options.bindingMetadata || {})[rawExp]
  console.log('bindingType', bindingType)

  // check props
  if (bindingType === BindingTypes.PROPS || bindingType === BindingTypes.PROPS_ALIASED) {
    // TODO: should throw error on `onError`
    return
  }

  const expString = exp.content
  const maybeRef =
    !__BROWSER__ &&
    context.options.inline &&
    (bindingType === BindingTypes.SETUP_LET ||
      bindingType === BindingTypes.SETUP_REF ||
      bindingType === BindingTypes.SETUP_MAYBE_REF)
  console.log('maybeRef', maybeRef)
  console.log('expString', expString)

  if (!expString.trim() || (!isMemberExpression(getExpSource(exp), context.options) && !maybeRef)) {
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
      // @ts-expect-error -- FIXME should resolve `modifiers` type
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      modelModifiers: dir.modifiers.map(m => m.content)
    }
  }

  const { name: tag } = node
  const isCustomElement = context.options.isCustomElement(tag)

  let runtimeDirective: VaporHelper | undefined = 'vModelText'
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || isCustomElement) {
    if (tag === 'input' || isCustomElement) {
      /*
      const type = findProp(node, 'type')
      if (type) {
        if (type.type === NodeTypes.DIRECTIVE) {
          // :type="foo"
          runtimeDirective = 'vModelDynamic'
        } else if (type.value) {
          switch (type.value.content) {
            case 'radio':
              runtimeDirective = 'vModelRadio'
              break
            case 'checkbox':
              runtimeDirective = 'vModelCheckbox'
              break
            case 'file':
              runtimeDirective = undefined
              context.options.onError(
                createDOMCompilerError(
                  DOMErrorCodes.X_V_MODEL_ON_FILE_INPUT_ELEMENT,
                  dir.loc,
                ),
              )
              break
            default:
              // text type
              __DEV__ && checkDuplicatedValue()
              break
          }
        }
      } else if (hasDynamicKeyVBind(node)) {
        // element has bindings with dynamic keys, which can possibly contain
        // "type".
        runtimeDirective = 'vModelDynamic'
      } else {
        // text type
        __DEV__ && checkDuplicatedValue()
      }
        */
    } else if (tag === 'select') {
      runtimeDirective = 'vModelSelect'
    } else {
      // textarea
      // __DEV__ && checkDuplicatedValue()
    }
  } else {
    // TODO:
    // context.options.onError(
    //   createDOMCompilerError(
    //     DOMErrorCodes.X_V_MODEL_ON_INVALID_ELEMENT,
    //     dir.loc,
    //   ),
    // )
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

  // NOTE: we don't need duplicate value check, because svelte binding allows it
  // function checkDuplicatedValue() {
  //   const value = findDir(node, 'bind')
  //   if (value && isStaticArgOf(value.arg, 'value')) {
  //     context.options.onError(
  //       createDOMCompilerError(
  //         DOMErrorCodes.X_V_MODEL_UNNECESSARY_VALUE,
  //         value.loc,
  //       ),
  //     )
  //   }
  // }
}
