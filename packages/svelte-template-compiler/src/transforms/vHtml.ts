// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-vapor`
// Author: Evan you (https://github.com/yyx990803) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-vapor/src/transforms/vHtml.ts

import { IRNodeTypes } from '../ir/index.ts'
import { resolveSimpleExpression } from './utils.ts'

import type { SvelteMustacheTag } from '../ir/svelte.ts'
import type { TransformContext } from './context.ts'
import type { NodeTransform } from './types.ts'

// TODO: transform vapor v-html from svelte {@html}
// https://svelte.dev/docs/special-tags#html
export const transformVHtml: NodeTransform = (node, context) => {
  if (node.type === 'RawMustacheTag') {
    const exp = resolveSimpleExpression(
      node as SvelteMustacheTag,
      context as TransformContext<SvelteMustacheTag>
    )
    context.registerEffect([exp], {
      type: IRNodeTypes.SET_HTML,
      element: context.reference(),
      value: exp
    })
  }
}
