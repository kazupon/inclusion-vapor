// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-vapor`
// Author: Evan you (https://github.com/yyx990803) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-vapor/src/transforms/vIf.ts

import { createStructuralDirectiveTransform, newBlock } from './utils.ts'

import type { BlockIRNode, SvelteElement, VaporDirectiveNode } from '../ir/index.ts'
import type { TransformContext } from './context.ts'
import type { NodeTransform } from './types.ts'

export const transformVIf: NodeTransform = createStructuralDirectiveTransform(
  ['if', 'else', 'else-if'],
  processIf
)

export function processIf(
  _node: SvelteElement,
  _dir: VaporDirectiveNode,
  _context: TransformContext<SvelteElement>
): (() => void) | undefined {
  // TODO: transform vapor v-if from svelte {#if}
  // https://svelte.dev/docs/logic-blocks#if

  return
}

export function createIfBranch(
  node: SvelteElement,
  context: TransformContext<SvelteElement>
): [BlockIRNode, () => void] {
  // TODO:

  const branch: BlockIRNode = newBlock(node)
  // const exitBlock = context.enterBlock(branch)
  context.reference()
  return [
    branch,
    () => {
      return
    }
  ]
}
