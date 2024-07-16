// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-vapor`
// Author: Evan you (https://github.com/yyx990803) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-vapor/src/ir/component.ts

import { IRDynamicPropsKind, IRSlotType } from '@vue-vapor/compiler-vapor'

import type { SimpleExpressionNode } from '@vue-vapor/compiler-dom'
import type { BlockIRNode, IRFor } from './nodes'
import type { DirectiveTransformResult } from '../transforms'

// props
export interface IRProp extends Omit<DirectiveTransformResult, 'value'> {
  values: SimpleExpressionNode[]
}

export type IRPropsStatic = IRProp[]

export interface IRPropsDynamicExpression {
  kind: IRDynamicPropsKind.EXPRESSION
  value: SimpleExpressionNode
  handler?: boolean
}

export interface IRPropsDynamicAttribute extends IRProp {
  kind: IRDynamicPropsKind.ATTRIBUTE
}

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
