// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `unplugin-vue-jsx-vapor`
// Author: zhiyuanzmj (https://github.com/zhiyuanzmj) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/unplugin/unplugin-vue-jsx-vapor
// Code url: https://github.com/unplugin/unplugin-vue-jsx-vapor/tree/main/src/core/compiler

import type { IRNodeTypes, IRDynamicInfo } from '@vue-vapor/compiler-vapor'

import type {
  BindingTypes,
  CompoundExpressionNode,
  DirectiveNode,
  SimpleExpressionNode
} from '@vue-vapor/compiler-dom'
import type { JSXFragment, BabelNode } from './jsx'
import type { IRProp, IRProps, IRSlots } from './component'
import type { Overwrite } from '../types'

export interface BaseIRNode {
  type: IRNodeTypes
}

export interface RootNode {
  type: IRNodeTypes.ROOT
  source: string
  children: JSXFragment['children']
  helpers: Set<symbol>
  components: string[]
  directives: string[]
  // loc: JSXElement['loc']
  // hoists: (JSChildNode | null)[]
  // imports: ImportItem[]
  // cached: (CacheExpression | null)[]
  temps: number
  ssrHelpers?: symbol[]
  // codegenNode?: TemplateChildNode | JSChildNode | BlockStatement
  transformed?: boolean
}

export interface BlockIRNode extends BaseIRNode {
  type: IRNodeTypes.BLOCK
  node: RootNode | BabelNode
  dynamic: IRDynamicInfo
  effect: IREffect[]
  operation: OperationNode[]
  returns: number[]
}

export interface RootIRNode {
  type: IRNodeTypes.ROOT
  node: RootNode
  source: string
  template: string[]
  component: Set<string>
  directive: Set<string>
  block: BlockIRNode
}

export interface IfIRNode extends BaseIRNode {
  type: IRNodeTypes.IF
  id: number
  condition: SimpleExpressionNode
  positive: BlockIRNode
  negative?: BlockIRNode | IfIRNode
  once?: boolean
}

export interface IRFor {
  source: SimpleExpressionNode
  value?: SimpleExpressionNode
  key?: SimpleExpressionNode
  index?: SimpleExpressionNode
}

export interface ForIRNode extends BaseIRNode, IRFor {
  type: IRNodeTypes.FOR
  id: number
  keyProp?: SimpleExpressionNode
  render: BlockIRNode
  once: boolean
}

export interface SetPropIRNode extends BaseIRNode {
  type: IRNodeTypes.SET_PROP
  element: number
  prop: IRProp
}

export interface SetDynamicPropsIRNode extends BaseIRNode {
  type: IRNodeTypes.SET_DYNAMIC_PROPS
  element: number
  props: IRProps[]
}

export interface SetDynamicEventsIRNode extends BaseIRNode {
  type: IRNodeTypes.SET_DYNAMIC_EVENTS
  element: number
  event: SimpleExpressionNode
}

export interface SetTextIRNode extends BaseIRNode {
  type: IRNodeTypes.SET_TEXT
  element: number
  values: SimpleExpressionNode[]
}

export type KeyOverride = [find: string, replacement: string]
export interface SetEventIRNode extends BaseIRNode {
  type: IRNodeTypes.SET_EVENT
  element: number
  key: SimpleExpressionNode
  value?: SimpleExpressionNode
  modifiers: {
    // modifiers for addEventListener() options, e.g. .passive & .capture
    options: string[]
    // modifiers that needs runtime guards, withKeys
    keys: string[]
    // modifiers that needs runtime guards, withModifiers
    nonKeys: string[]
  }
  keyOverride?: KeyOverride
  delegate: boolean
  /** Whether it's in effect */
  effect: boolean
}

export interface SetHtmlIRNode extends BaseIRNode {
  type: IRNodeTypes.SET_HTML
  element: number
  value: SimpleExpressionNode
}

export interface SetTemplateRefIRNode extends BaseIRNode {
  type: IRNodeTypes.SET_TEMPLATE_REF
  element: number
  value: SimpleExpressionNode
  refFor: boolean
  effect: boolean
}

export interface SetModelValueIRNode extends BaseIRNode {
  type: IRNodeTypes.SET_MODEL_VALUE
  element: number
  key: SimpleExpressionNode
  value: SimpleExpressionNode
  bindingType?: BindingTypes
  isComponent: boolean
}

export interface CreateTextNodeIRNode extends BaseIRNode {
  type: IRNodeTypes.CREATE_TEXT_NODE
  id: number
  values: SimpleExpressionNode[]
  effect: boolean
}

export interface InsertNodeIRNode extends BaseIRNode {
  type: IRNodeTypes.INSERT_NODE
  elements: number[]
  parent: number
  anchor?: number
}

export interface PrependNodeIRNode extends BaseIRNode {
  type: IRNodeTypes.PREPEND_NODE
  elements: number[]
  parent: number
}

export interface WithDirectiveIRNode extends BaseIRNode {
  type: IRNodeTypes.WITH_DIRECTIVE
  element: number
  dir: VaporDirectiveNode
  name: string
  builtin?: boolean
  asset?: boolean
}

export interface CreateComponentIRNode extends BaseIRNode {
  type: IRNodeTypes.CREATE_COMPONENT_NODE
  id: number
  tag: string
  props: IRProps[]
  slots: IRSlots[]
  asset: boolean
  root: boolean
  once: boolean
}

export interface DeclareOldRefIRNode extends BaseIRNode {
  type: IRNodeTypes.DECLARE_OLD_REF
  id: number
}

export interface SlotOutletIRNode extends BaseIRNode {
  type: IRNodeTypes.SLOT_OUTLET_NODE
  id: number
  name: SimpleExpressionNode
  props: IRProps[]
  fallback?: BlockIRNode
}

export type IRNode = OperationNode | RootIRNode
export type OperationNode =
  | SetPropIRNode
  | SetDynamicPropsIRNode
  | SetTextIRNode
  | SetEventIRNode
  | SetDynamicEventsIRNode
  | SetHtmlIRNode
  | SetTemplateRefIRNode
  | SetModelValueIRNode
  | CreateTextNodeIRNode
  | InsertNodeIRNode
  | PrependNodeIRNode
  | WithDirectiveIRNode
  | IfIRNode
  | ForIRNode
  | CreateComponentIRNode
  | DeclareOldRefIRNode
  | SlotOutletIRNode

export interface IREffect {
  expressions: SimpleExpressionNode[]
  operations: OperationNode[]
}

export type VaporDirectiveNode = Overwrite<
  DirectiveNode,
  {
    exp: Exclude<DirectiveNode['exp'], CompoundExpressionNode>
    arg: Exclude<DirectiveNode['arg'], CompoundExpressionNode>
  }
>

export type { IRDynamicInfo } from '@vue-vapor/compiler-vapor'
export { IRNodeTypes, DynamicFlag, IRDynamicPropsKind } from '@vue-vapor/compiler-vapor'
