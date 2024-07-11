import { EMPTY_OBJ, NOOP, extend } from '@vue-vapor/shared'
import { defaultOnError, defaultOnWarn } from '@vue-vapor/compiler-dom'
import { newDynamic } from './utils'
import { IRDynamicInfo } from '../ir'

import type {
  CompilerCompatOptions,
  TransformOptions as BaseTransformOptions
} from '@vue-vapor/compiler-dom'
import type {
  RootNode,
  RootIRNode,
  BlockIRNode,
  IRSlots,
  SvelteTemplateNode,
  SvelteComment
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
  // eslint-disable-next-line unicorn/no-null
  parent: TransformContext<RootNode | SvelteTemplateNode> | null = null
  root: TransformContext<RootNode>
  index: number = 0

  block: BlockIRNode
  options: Required<Omit<TransformOptions, 'filename' | keyof CompilerCompatOptions>>

  template: string = ''
  childrenTemplate: (string | null)[] = []
  dynamic: IRDynamicInfo

  inVOnce: boolean = false
  inVFor: number = 0

  comment: SvelteComment[] = []
  component: Set<string>
  directive: Set<string>

  slots: IRSlots[] = []

  private globalId = 0

  constructor(
    public ir: RootIRNode,
    public node: T,
    options: TransformOptions = {}
  ) {
    this.options = extend({}, defaultOptions, options)
    this.root = this as TransformContext<RootNode>

    this.block = this.ir.block
    this.dynamic = this.ir.block.dynamic
    this.component = this.ir.component
    this.directive = this.ir.directive
  }

  increaseId = (): number => this.globalId++

  pushTemplate(content: string): number {
    const existing = this.ir.template.indexOf(content)
    if (existing !== -1) {
      return existing
    }
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

  create<T extends SvelteTemplateNode>(node: T, index: number): TransformContext<T> {
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
