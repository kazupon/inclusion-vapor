import { IRNodeTypes, DynamicFlag } from '@vue-vapor/compiler-vapor'

import type {
  // Node,
  BindingTypes,
  CompoundExpressionNode,
  DirectiveNode,
  SimpleExpressionNode
} from '@vue/compiler-dom'
// eslint-disable-next-line unicorn/prevent-abbreviations
import type { IRProp, IRProps, IRSlots } from './component'
import type { CompileResult } from 'svelte/compiler'

export type SvelteAst = CompileResult['ast']
export type SvelteFragment = CompileResult['ast']['html']

export interface BaseIRNode {
  type: IRNodeTypes
}

export interface RootNode /* extends Node */ {
  type: IRNodeTypes.ROOT
  source: string
  children: SvelteFragment[]
  helpers: Set<symbol>
  components: string[]
  directives: string[]
  // hoists: (JSChildNode | null)[]
  // imports: ImportItem[]
  // cached: (CacheExpression | null)[]
  temps: number
  ssrHelpers?: symbol[]
  // codegenNode?: TemplateChildNode | JSChildNode | BlockStatement
  transformed?: boolean
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

export interface BlockIRNode extends BaseIRNode {
  type: IRNodeTypes.BLOCK
  // node: RootNode | TemplateChildNode
  node: RootNode | SvelteFragment
  dynamic: IRDynamicInfo
  effect: IREffect[]
  operation: OperationNode[]
  returns: number[]
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

// eslint-disable-next-line unicorn/prevent-abbreviations
export interface SetPropIRNode extends BaseIRNode {
  type: IRNodeTypes.SET_PROP
  element: number
  prop: IRProp
}

// eslint-disable-next-line unicorn/prevent-abbreviations
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

// eslint-disable-next-line unicorn/prevent-abbreviations
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

// eslint-disable-next-line unicorn/prevent-abbreviations
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

export interface IRDynamicInfo {
  id?: number
  flags: DynamicFlag
  anchor?: number
  children: IRDynamicInfo[]
  template?: number
}

export interface IREffect {
  expressions: SimpleExpressionNode[]
  operations: OperationNode[]
}

type Overwrite<T, U> = Pick<T, Exclude<keyof T, keyof U>> & Pick<U, Extract<keyof U, keyof T>>

// export type HackOptions<T> = Prettify<
//   Overwrite<
//     T,
//     {
//       nodeTransforms?: NodeTransform[]
//       directiveTransforms?: Record<string, DirectiveTransform | undefined>
//     }
//   >
// >

export type VaporDirectiveNode = Overwrite<
  DirectiveNode,
  {
    exp: Exclude<DirectiveNode['exp'], CompoundExpressionNode>
    arg: Exclude<DirectiveNode['arg'], CompoundExpressionNode>
  }
>
