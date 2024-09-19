// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-vapor`
// Author: Evan you (https://github.com/yyx990803) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-vapor/src/transforms/transformTemplateRef.ts

import { createSimpleExpression } from '@vue-vapor/compiler-dom'
import {
  convertVaporAttribute,
  IRNodeTypes,
  isSvelteBindingDirective,
  isSvelteElement
} from '../ir/index.ts'
import { EMPTY_EXPRESSION, isConstantExpression } from './utils.ts'

import type { NodeTransform } from './types.ts'

// NOTE: transform vapor template ref for svelte `bind:this`
// https://svelte.dev/docs/element-directives#bind-this
// https://svelte.dev/docs/component-directives#bind-this
export const transformTemplateRef: NodeTransform = (node, context) => {
  if (!isSvelteElement(node)) {
    return
  }

  const attr = node.attributes.find(attr => isSvelteBindingDirective(attr))
  if (!attr) {
    return
  }

  const vaporAttr = convertVaporAttribute(attr)
  if (vaporAttr.name !== 'ref') {
    return
  }

  const value = vaporAttr.value
    ? createSimpleExpression(vaporAttr.value.content, true, vaporAttr.value.loc)
    : EMPTY_EXPRESSION

  return () => {
    const id = context.reference()
    const effect = !isConstantExpression(value)
    if (effect) {
      context.registerOperation({
        type: IRNodeTypes.DECLARE_OLD_REF,
        id
      })
    }
    context.registerEffect([value], {
      type: IRNodeTypes.SET_TEMPLATE_REF,
      element: id,
      value,
      refFor: !!context.inVFor,
      effect
    })
  }
}
