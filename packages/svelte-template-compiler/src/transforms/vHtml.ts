// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-vapor`
// Author: Evan you (https://github.com/yyx990803) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-vapor/src/transforms/vHtml.ts

import type { DirectiveTransform } from './types.ts'

export const transformVHtml: DirectiveTransform = (_dir, _node, _context) => {
  // TODO: transform vapor v-html from svelte {@html}
  // https://svelte.dev/docs/special-tags#html
}
