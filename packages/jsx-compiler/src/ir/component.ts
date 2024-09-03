// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `unplugin-vue-jsx-vapor`
// Author: zhiyuanzmj (https://github.com/zhiyuanzmj) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/unplugin/unplugin-vue-jsx-vapor
// Code url: https://github.com/unplugin/unplugin-vue-jsx-vapor/tree/main/src/core/compiler

import type { IRDynamicPropsKind } from '@vue-vapor/compiler-vapor'

import type { SimpleExpressionNode } from '@vue-vapor/compiler-dom'
import type { DirectiveTransformResult } from '../transforms/index.ts'
import type { BlockIRNode, IRFor } from './nodes.ts'

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

export enum IRSlotType {
  STATIC,
  DYNAMIC,
  LOOP,
  CONDITIONAL,
  EXPRESSION
}

export interface IRSlotsStatic {
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
export interface IRSlotsExpression {
  slotType: IRSlotType.EXPRESSION
  slots: SimpleExpressionNode
}

export type IRSlotDynamic = IRSlotDynamicBasic | IRSlotDynamicLoop | IRSlotDynamicConditional
export type IRSlots = IRSlotsStatic | IRSlotDynamic | IRSlotsExpression
