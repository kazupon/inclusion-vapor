// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `unplugin-vue-jsx-vapor`
// Author: zhiyuanzmj (https://github.com/zhiyuanzmj) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/unplugin/unplugin-vue-jsx-vapor
// Code url: https://github.com/unplugin/unplugin-vue-jsx-vapor/tree/main/src/core/compiler

import { NOOP, extend, EMPTY_OBJ } from '@vue-vapor/shared'
import { defaultOnError, defaultOnWarn } from '@vue-vapor/compiler-dom'
import { newDynamic, isConstantExpression } from './utils'
import { DynamicFlag } from '../ir'

import type {
  CompilerCompatOptions,
  SimpleExpressionNode,
  CommentNode,
  TransformOptions as BaseTransformOptions
} from '@vue-vapor/compiler-dom'
import type {
  RootNode,
  RootIRNode,
  BlockIRNode,
  OperationNode,
  IRDynamicInfo,
  IRSlots,
  JSXElement,
  JSXFragment
} from '../ir'
import type { HackOptions } from './types'

const defaultOptions = {
  filename: '',
  prefixIdentifiers: false,
  hoistStatic: false,
  hmr: false,
  cacheHandlers: false,
  nodeTransforms: [],
  directiveTransforms: {},
  transformHoist: null, // eslint-disable-line unicorn/no-null
  isBuiltInComponent: NOOP,
  isCustomElement: NOOP,
  expressionPlugins: [],
  scopeId: null, // eslint-disable-line unicorn/no-null
  slotted: true,
  ssr: false,
  inSSR: false,
  ssrCssVars: ``,
  bindingMetadata: EMPTY_OBJ,
  inline: false,
  isTS: false,
  onError: defaultOnError,
  onWarn: defaultOnWarn
}

export type TransformOptions = HackOptions<BaseTransformOptions>

export class TransformContext<T extends BlockIRNode['node'] = BlockIRNode['node']> {
  ir: RootIRNode
  node: T
  // eslint-disable-next-line unicorn/no-null
  parent: TransformContext<RootNode | JSXElement | JSXFragment> | null = null
  root: TransformContext<RootNode>
  index: number = 0

  block: BlockIRNode
  options: Required<Omit<TransformOptions, 'filename' | keyof CompilerCompatOptions>>

  template: string = ''
  childrenTemplate: (string | null)[] = []
  dynamic: IRDynamicInfo

  inVOnce: boolean = false
  inVFor: number = 0

  comment: CommentNode[] = []
  component: Set<string>
  directive: Set<string>

  slots: IRSlots[] = []

  private globalId = 0

  constructor(ir: RootIRNode, node: T, options: TransformOptions = {}) {
    this.ir = ir
    this.node = node
    this.options = extend({}, defaultOptions, options)
    this.root = this as TransformContext<RootNode>

    this.block = this.ir.block
    this.dynamic = this.ir.block.dynamic
    this.component = this.ir.component
    this.directive = this.ir.directive
  }

  enterBlock(ir: BlockIRNode, isVFor: boolean = false): () => void {
    const { block, template, dynamic, childrenTemplate, slots } = this
    this.block = ir
    this.dynamic = ir.dynamic
    this.template = ''
    this.childrenTemplate = []
    this.slots = []
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    isVFor && this.inVFor++
    return () => {
      // exit
      this.registerTemplate()
      this.block = block
      this.template = template
      this.dynamic = dynamic
      this.childrenTemplate = childrenTemplate
      this.slots = slots
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      isVFor && this.inVFor--
    }
  }

  increaseId = (): number => this.globalId++

  reference(): number {
    if (this.dynamic.id !== undefined) {
      return this.dynamic.id
    }
    this.dynamic.flags |= DynamicFlag.REFERENCED
    return (this.dynamic.id = this.increaseId())
  }

  pushTemplate(content: string): number {
    const existing = this.ir.template.indexOf(content)
    if (existing !== -1) return existing
    this.ir.template.push(content)
    return this.ir.template.length - 1
  }

  registerTemplate(): number {
    if (!this.template) {
      return -1
    }
    const id = this.pushTemplate(this.template)
    return (this.dynamic.template = id)
  }

  registerEffect(expressions: SimpleExpressionNode[], ...operations: OperationNode[]): void {
    expressions = expressions.filter(exp => !isConstantExpression(exp))
    if (this.inVOnce || expressions.length === 0) {
      return this.registerOperation(...operations)
    }
    const existing = this.block.effect.find(e => isSameExpression(e.expressions, expressions))
    if (existing) {
      existing.operations.push(...operations)
    } else {
      this.block.effect.push({
        expressions,
        operations
      })
    }

    function isSameExpression(a: SimpleExpressionNode[], b: SimpleExpressionNode[]) {
      if (a.length !== b.length) {
        return false
      }
      return a.every((exp, i) => exp.content === b[i].content)
    }
  }

  registerOperation(...node: OperationNode[]): void {
    this.block.operation.push(...node)
  }

  create<E extends T>(node: E, index: number): TransformContext<E> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return Object.assign(Object.create(TransformContext.prototype), this, {
      node,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      parent: this as any,
      index,

      template: '',
      childrenTemplate: [],
      dynamic: newDynamic()
    } satisfies Partial<TransformContext<T>>)
  }
}