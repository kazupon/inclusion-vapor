// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-vapor`
// Author: Evan you (https://github.com/yyx990803) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-vapor/src/transforms/transformTemplateRef.ts

import type { NodeTransform } from './types.ts'

export const transformTemplateRef: NodeTransform = (_node, _context) => {
  // TODO: transform vapor template ref for svelte `bind:this`
  // https://svelte.dev/docs/element-directives#bind-this
  // https://svelte.dev/docs/component-directives#bind-this

  return () => {
    // TODO:
  }
}
