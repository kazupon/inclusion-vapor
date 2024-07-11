import { defaultOnError, defaultOnWarn } from '@vue-vapor/compiler-dom'
import { EMPTY_OBJ, NOOP, extend, isArray } from '@vue-vapor/shared'
import { newBlock } from './transforms/utils'
import { IRNodeTypes } from './ir'

import type {
  CompilerCompatOptions,
  SimpleExpressionNode,
  TransformOptions as BaseTransformOptions
} from '@vue-vapor/compiler-dom'
import type {
  RootIRNode,
  RootNode,
  BlockIRNode,
  VaporDirectiveNode,
  SvelteElement,
  HackOptions
} from './ir'

export type NodeTransform = (
  // node: RootNode | TemplateChildNode,
  // context: TransformContext<RootNode | TemplateChildNode>,
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

// // A structural directive transform is technically also a NodeTransform;
// // Only v-if and v-for fall into this category.
// export type StructuralDirectiveTransform = (
//   node: SvelteElement,
//   dir: VaporDirectiveNode,
//   context: TransformContext<SvelteElement>,
// ) => void | (() => void)

export type TransformOptions = HackOptions<BaseTransformOptions>

// TODO: TransformContext implementation
export class TransformContext<T extends BlockIRNode['node'] = BlockIRNode['node']> {
  root: TransformContext<RootNode>

  options: Required<Omit<TransformOptions, 'filename' | keyof CompilerCompatOptions>>
  constructor(
    public ir: RootIRNode,
    public node: T,
    options: TransformOptions = {}
  ) {
    this.options = extend({}, defaultOptions, options)
    this.root = this as TransformContext<RootNode>
  }
}

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

// Svelte AST -> IR
export function transform(node: RootNode, options: TransformOptions = {}): RootIRNode {
  const ir: RootIRNode = {
    type: IRNodeTypes.ROOT,
    node,
    source: node.source,
    template: [],
    component: new Set(),
    directive: new Set(),
    block: newBlock(node)
  }

  const context = new TransformContext(ir, node, options)

  transformNode(context)

  return ir
}

export function transformNode(context: TransformContext): void {
  let { node } = context

  // apply transform plugins
  const { nodeTransforms } = context.options
  const exitFns: ReturnType<NodeTransform> = []
  for (const nodeTransform of nodeTransforms) {
    const onExit = nodeTransform(node, context)
    if (onExit) {
      if (isArray(onExit)) {
        exitFns.push(...onExit)
      } else {
        exitFns.push(onExit)
      }
    }
    if (context.node) {
      // node may have been replaced
      node = context.node
    } else {
      // node was removed
      return
    }
  }

  // exit transforms
  context.node = node
  let i = exitFns.length
  while (i--) {
    exitFns[i]()
  }

  if (context.node.type === IRNodeTypes.ROOT) {
    // context.registerTemplate()
  }
}
