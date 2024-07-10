import { IRDynamicPropsKind, IRSlotType } from '@vue-vapor/compiler-vapor'

import type { SimpleExpressionNode } from '@vue/compiler-dom'
// import type { DirectiveTransformResult } from '../transform'
import type { BlockIRNode, IRFor } from './ast'

// TODO:
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DirectiveTransformResult = any

// props
// eslint-disable-next-line unicorn/prevent-abbreviations
export interface IRProp extends Omit<DirectiveTransformResult, 'value'> {
  values: SimpleExpressionNode[]
}

// eslint-disable-next-line unicorn/prevent-abbreviations
export type IRPropsStatic = IRProp[]
// eslint-disable-next-line unicorn/prevent-abbreviations
export interface IRPropsDynamicExpression {
  kind: IRDynamicPropsKind.EXPRESSION
  value: SimpleExpressionNode
  handler?: boolean
}
// eslint-disable-next-line unicorn/prevent-abbreviations
export interface IRPropsDynamicAttribute extends IRProp {
  kind: IRDynamicPropsKind.ATTRIBUTE
}
// eslint-disable-next-line unicorn/prevent-abbreviations
export type IRProps = IRPropsStatic | IRPropsDynamicAttribute | IRPropsDynamicExpression

// slots
export interface SlotBlockIRNode extends BlockIRNode {
  props?: SimpleExpressionNode
}

export type IRSlotsStatic = {
  slotType: IRSlotType.STATIC
  slots: Record<string, SlotBlockIRNode>
}
export interface IRSlotDynamicBasic {
  slotType: IRSlotType.DYNAMIC
  name: SimpleExpressionNode
  fn: SlotBlockIRNode
}
export interface IRSlotDynamicLoop {
  slotType: IRSlotType.LOOP
  name: SimpleExpressionNode
  fn: SlotBlockIRNode
  loop: IRFor
}
export interface IRSlotDynamicConditional {
  slotType: IRSlotType.CONDITIONAL
  condition: SimpleExpressionNode
  positive: IRSlotDynamicBasic
  negative?: IRSlotDynamicBasic | IRSlotDynamicConditional
}

export type IRSlotDynamic = IRSlotDynamicBasic | IRSlotDynamicLoop | IRSlotDynamicConditional
export type IRSlots = IRSlotsStatic | IRSlotDynamic
