// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `unplugin-vue-jsx-vapor`
// Author: zhiyuanzmj (https://github.com/zhiyuanzmj) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/unplugin/unplugin-vue-jsx-vapor
// Code url: https://github.com/unplugin/unplugin-vue-jsx-vapor/tree/main/src/core/compiler

import { parse } from '@babel/parser'
import { ErrorCodes, createCompilerError, defaultOnError } from '@vue-vapor/compiler-dom'
import { generate } from '@vue-vapor/compiler-vapor'
import { extend, isString } from '@vue-vapor/shared'
import { IRNodeTypes } from './ir/index.ts'
import { transform } from './transform.ts'
import {
  transformBind,
  transformChildren,
  transformElement,
  transformOn,
  transformText
} from './transforms/index.ts'

import type {
  CompilerOptions as BaseCompilerOptions,
  VaporCodegenResult as BaseVaporCodegenResult,
  RootIRNode as VaporRootIRNode
} from '@vue-vapor/compiler-vapor'
import type { BabelProgram, JSXElement, JSXFragment, RootIRNode, RootNode } from './ir/index.ts'
import type { DirectiveTransform, HackOptions, NodeTransform } from './transforms/index.ts'

export interface VaporCodegenResult extends Omit<BaseVaporCodegenResult, 'ast'> {
  ast: RootIRNode
}

// code/AST -> IR (transform) -> JS (generate)
export function compile(
  source: string | BabelProgram,
  options: CompilerOptions = {}
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

  const prefixIdentifiers = !__BROWSER__ && options.prefixIdentifiers === true

  if (options.scopeId && !isModuleMode) {
    onError(createCompilerError(ErrorCodes.X_SCOPE_ID_NOT_SUPPORTED))
  }

  const resolvedOptions = extend({}, options, {
    prefixIdentifiers,
    expressionPlugins: options.expressionPlugins || ['jsx']
  })

  if (!__BROWSER__ && options.isTS) {
    const { expressionPlugins } = resolvedOptions
    if (!expressionPlugins.includes('typescript')) {
      resolvedOptions.expressionPlugins = [...(expressionPlugins || []), 'typescript']
    }
  }

  const {
    body: [statement]
  } = isString(source)
    ? parse(source, {
        sourceType: 'module',
        plugins: resolvedOptions.expressionPlugins
      }).program
    : source
  let children!: JSXElement[] | JSXFragment['children']
  if (statement.type === 'ExpressionStatement') {
    children =
      statement.expression.type === 'JSXFragment'
        ? statement.expression.children
        : statement.expression.type === 'JSXElement'
          ? [statement.expression]
          : []
  }

  const ast: RootNode = {
    type: IRNodeTypes.ROOT,
    children,
    source: isString(source) ? source : '', // TODO
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

  return generate(
    ir as unknown as VaporRootIRNode,
    resolvedOptions
  ) as unknown as VaporCodegenResult
}

interface JsxCompilerOptions {
  /**
   * jsx parser
   * @param source - jsx code
   * @returns Babel AST
   */
  parser?: (source: string) => BabelProgram
}

export type CompilerOptions = HackOptions<BaseCompilerOptions> & JsxCompilerOptions
export type TransformPreset = [NodeTransform[], Record<string, DirectiveTransform>]

export function getBaseTransformPreset(_prefixIdentifiers?: boolean): TransformPreset {
  return [
    [
      transformText,
      transformElement,
      // transformSlot,
      transformChildren
    ],
    {
      bind: transformBind,
      on: transformOn
      // model: transformModel,
      // show: transformShow,
      // html: transformHtml,
    }
  ]
}
