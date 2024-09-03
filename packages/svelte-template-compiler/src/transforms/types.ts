// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-vapor`
// Author: Evan you (https://github.com/yyx990803) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/vuejs/core-vapor

import type { SimpleExpressionNode } from '@vue-vapor/compiler-dom'
import type { Prettify } from '@vue-vapor/shared'
import type { BlockIRNode, SvelteElement, VaporDirectiveNode } from '../ir/index.ts'
import type { Overwrite } from '../types.ts'
import type { TransformContext } from './context.ts'

export type NodeTransform = (
  node: BlockIRNode['node'],
  context: TransformContext<BlockIRNode['node']>
) => void | (() => void) | (() => void)[]

export type DirectiveTransform = (
  dir: VaporDirectiveNode,
  node: SvelteElement, // TODO: maybe, we need to change other Svelet AST node
  context: TransformContext<SvelteElement> // TODO: maybe, we need to change other Svelet AST node
) => DirectiveTransformResult | void

export interface DirectiveTransformResult {
  key: SimpleExpressionNode
  value: SimpleExpressionNode
  modifier?: '.' | '^'
  runtimeCamelize?: boolean
  handler?: boolean
  model?: boolean
  modelModifiers?: string[]
}

export type HackOptions<T> = Prettify<
  Overwrite<
    T,
    {
      nodeTransforms?: NodeTransform[]
      directiveTransforms?: Record<string, DirectiveTransform | undefined>
    }
  >
>

// A structural directive transform is technically also a NodeTransform;
// svelte #if, #each logic blocks into this category.
export type StructuralDirectiveTransform = (
  node: SvelteElement,
  dir: VaporDirectiveNode,
  context: TransformContext<SvelteElement>
) => void | (() => void)
