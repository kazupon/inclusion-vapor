// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-vapor`
// Author: Evan you (https://github.com/yyx990803) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-vapor/src/compile.ts

import { ErrorCodes, createCompilerError, defaultOnError } from '@vue-vapor/compiler-dom'
import { generate } from '@vue-vapor/compiler-vapor'
import { extend, isString } from '@vue-vapor/shared'
import { IRNodeTypes } from './ir/index.ts'
import { transform } from './transform.ts'
import {
  transformChildren,
  transformComment,
  transformElement,
  transformText,
  transformVBind,
  transformVFor,
  transformVIf,
  transformVOn
} from './transforms/index.ts'

import type {
  CompilerOptions as BaseCompilerOptions,
  VaporCodegenResult,
  RootIRNode as VaporRootIRNode
} from '@vue-vapor/compiler-vapor'
import type { RootNode, SvelteTemplateNode } from './ir/index.ts'
import type { DirectiveTransform, HackOptions, NodeTransform } from './transforms/index.ts'

// Svelte Template Code / Svelte Template AST -> IR (transform) -> JS (generate)
export function compile(
  source: string | SvelteTemplateNode,
  options: CompilerOptions = {} // TODO: maybe we need some svelte compiler options
): VaporCodegenResult {
  const onError = options.onError || defaultOnError
  const isModuleMode = options.mode === 'module'
  /* istanbul ignore if */
  if (__BROWSER__) {
    if (options.prefixIdentifiers === true) {
      onError(createCompilerError(ErrorCodes.X_PREFIX_ID_NOT_SUPPORTED))
    } else if (isModuleMode) {
      onError(createCompilerError(ErrorCodes.X_MODULE_MODE_NOT_SUPPORTED))
    }
  }

  const prefixIdentifiers = !__BROWSER__ && (options.prefixIdentifiers === true || isModuleMode)

  if (options.scopeId && !isModuleMode) {
    onError(createCompilerError(ErrorCodes.X_SCOPE_ID_NOT_SUPPORTED))
  }

  const resolvedOptions = extend({}, options, {
    prefixIdentifiers
  })

  const svelteAst = isString(source) ? getSvelteTemplateNode(source, options) : source

  const ast: RootNode = {
    type: IRNodeTypes.ROOT,
    children: svelteAst.children || [],
    source: isString(source) ? source : '', // TODO:
    components: [],
    directives: [],
    helpers: new Set(),
    temps: 0
  }

  const [nodeTransforms, directiveTransforms] = getBaseTransformPreset(prefixIdentifiers)

  const ir = transform(
    ast,
    extend({}, resolvedOptions, {
      nodeTransforms: [
        ...nodeTransforms,
        ...(options.nodeTransforms || []) // user transforms
      ],
      directiveTransforms: extend(
        {},
        directiveTransforms,
        options.directiveTransforms || {} // user transforms
      )
    })
  )

  return generate(ir as unknown as VaporRootIRNode, resolvedOptions)
}

function getSvelteTemplateNode(
  source: string,
  { parser }: SvelteCompilerOptions
): SvelteTemplateNode {
  if (!parser) {
    throw new Error('svelte code parsing function option is not given.')
  }
  return parser(source)
}

interface SvelteCompilerOptions {
  /**
   * Svelte parser
   * @param source - Svelte code
   * @returns Svelte template AST
   */
  parser?: (source: string) => SvelteTemplateNode
}

export type CompilerOptions = HackOptions<BaseCompilerOptions> & SvelteCompilerOptions
export type TransformPreset = [NodeTransform[], Record<string, DirectiveTransform>]

export type { VaporCodegenResult } from '@vue-vapor/compiler-vapor'

export function getBaseTransformPreset(_prefixIdentifiers?: boolean): TransformPreset {
  return [
    [
      // transformVOnce,
      transformVIf,
      transformVFor,
      // transformSlotOutlet,
      // transformTemplateRef,
      transformText,
      transformElement,
      // transformVSlot,
      transformComment,
      transformChildren
    ],
    {
      bind: transformVBind,
      on: transformVOn
      // html: transformVHtml,
      // text: transformVText,
      // show: transformVShow,
      // model: transformVModel,
    }
  ]
}
