// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-vapor`
// Author: Evan you (https://github.com/yyx990803) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-vapor/src/transforms/vIf.ts

import { createStructuralDirectiveTransform } from './utils.ts'

import type { SvelteElement, VaporDirectiveNode } from '../ir/index.ts'
import type { TransformContext } from './context.ts'
import type { NodeTransform } from './types.ts'

export const transformVFor: NodeTransform = createStructuralDirectiveTransform('for', processFor)

export function processFor(
  _node: SvelteElement,
  _dir: VaporDirectiveNode,
  _context: TransformContext<SvelteElement>
) {
  // TODO: transform vapor v-for from svelte {#each}
  // https://svelte.dev/docs/logic-blocks#each

  return (): void => {
    // TODO:
  }
}
