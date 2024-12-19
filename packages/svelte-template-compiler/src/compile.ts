// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-vapor`
// Author: Evan you (https://github.com/yyx990803) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-vapor/src/compile.ts

import { ErrorCodes, createCompilerError, defaultOnError } from '@vue-vapor/compiler-dom'
import { generate } from '@vue-vapor/compiler-vapor'
import { extend, isString } from '@vue-vapor/shared'
import { IRNodeTypes, enableStructures, isSvelteParseError } from './ir/index.ts'
import { getBaseTransformPreset, transform } from './transform.ts'

import type { CompilerError, SourceLocation } from '@vue-vapor/compiler-dom'
import type {
  CompilerOptions as BaseCompilerOptions,
  VaporCodegenResult,
  RootIRNode as VaporRootIRNode
} from '@vue-vapor/compiler-vapor'
import type {
  RootNode,
  SvelteCompileError,
  SvelteElement,
  SvelteStyle,
  SvelteTemplateNode
} from './ir/index.ts'
import type { HackOptions } from './transforms/index.ts'

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

  let svelteTemplateAst = {} as SvelteTemplateNode
  let svelteStyleAst: SvelteStyle | undefined
  try {
    const ret = parse(source, resolvedOptions)
    svelteTemplateAst = ret.html
    svelteStyleAst = ret.css
  } catch (error: unknown) {
    if (isSvelteParseError(error) && isString(source)) {
      const vaporError = error as unknown as CompilerError
      vaporError.loc = convertToVaporCompileErrorSourceLocation(source, error)
      onError(vaporError)
    } else {
      onError(error as CompilerError)
    }
  }

  if (options.scopedCssApplyer) {
    enableStructures(svelteTemplateAst)
  }

  const ast: RootNode = {
    ...svelteTemplateAst,
    type: IRNodeTypes.ROOT,
    children: svelteTemplateAst.children || [],
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
      ),
      css: svelteStyleAst
    })
  )

  return generate(ir as unknown as VaporRootIRNode, resolvedOptions)
}

function parse(
  source: string | SvelteTemplateNode,
  { parser, css }: SvelteCompilerOptions
): SvelteCompilerResult {
  if (isString(source)) {
    if (!parser) {
      throw new Error('"parser" option is not given.')
    }
    const ret = parser(source)
    ret.css ||= css
    return ret
  } else {
    return {
      html: source,
      css
    }
  }
}

function convertToVaporCompileErrorSourceLocation(
  source: string,
  error: SvelteCompileError
): SourceLocation {
  return {
    start: {
      offset: error.start.character, // TODO: is this correct?
      line: error.start.line,
      column: error.start.column
    },
    end: {
      offset: error.end.character, // TODO: is this correct?
      line: error.end.line,
      column: error.end.column
    },
    source
  }
}

export type ScopedCssApplyer = (node: SvelteElement) => void

interface SvelteCompilerOptions {
  /**
   * Svelte parser
   * @param source - Svelte code
   * @returns Svelte AST, which has svelte template ast and svelte style ast optionally
   */
  parser?: (source: string) => SvelteCompilerResult
  /**
   * Svelte AST style
   * @description if your parser does not return svelte style ast, this option will be used as svelte style ast
   */
  css?: SvelteStyle
  /**
   * scoped css applyer
   * @description if you want to apply scoped style, you can use this option
   */
  scopedCssApplyer?: ScopedCssApplyer
}

export type SvelteCompilerResult = {
  html: SvelteTemplateNode
  css?: SvelteStyle
}

export type CompilerOptions = HackOptions<BaseCompilerOptions> & SvelteCompilerOptions

export type { VaporCodegenResult } from '@vue-vapor/compiler-vapor'
