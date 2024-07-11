import type { Prettify } from '@vue-vapor/shared'
import type { SimpleExpressionNode } from '@vue-vapor/compiler-dom'
import type { TransformContext } from './context'
import type { BlockIRNode, VaporDirectiveNode, SvelteElement } from '../ir'
import type { Overwrite } from '../types'

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
