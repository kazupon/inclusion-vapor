import type { Prettify } from '@vue-vapor/shared'
import type { SimpleExpressionNode } from '@vue-vapor/compiler-dom'
import type { TransformContext } from './context'
import type { BlockIRNode, JSXAttribute, JSXElement } from '../ir'
import type { Overwrite } from '../types'

export type NodeTransform = (
  node: BlockIRNode['node'],
  context: TransformContext<BlockIRNode['node']>
) => void | (() => void) | (() => void)[]

export type DirectiveTransform = (
  dir: JSXAttribute,
  node: JSXElement,
  context: TransformContext<JSXElement>
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
