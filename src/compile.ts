import { parse } from 'svelte/compiler'
import { ErrorCodes, createCompilerError, defaultOnError } from '@vue-vapor/compiler-dom'
import { generate } from '@vue-vapor/compiler-vapor'
import { extend, isString } from '@vue-vapor/shared'
import { transform } from './transform'
import { IRNodeTypes } from './ir'

import type {
  CompilerOptions,
  VaporCodegenResult,
  RootIRNode as VaporRootIRNode
} from '@vue-vapor/compiler-vapor'
import type { SvelteAst, RootNode } from './ir'
import type { NodeTransform, DirectiveTransform } from './transforms'

// Svelte Code / Svelte AST -> IR (transform) -> JS (generate)
export function compile(
  source: string | SvelteAst,
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

  // TODO: tweak options for svelte parser
  const svelteAst = isString(source) ? parse(source) : source
  // TODO: convert `instance` and `module` to the Vapor (Vue) runtime API
  // svelteAst.instance
  // svelteAst.module

  const ast: RootNode = {
    type: IRNodeTypes.ROOT,
    children: svelteAst.html.children || [],
    source: isString(source) ? source : '', // TODO
    components: [],
    directives: [],
    helpers: new Set(),
    temps: 0
  }

  const [nodeTransforms, directiveTransforms] = getBaseTransformPreset(prefixIdentifiers)

  const ir = transform(
    ast,
    // @ts-expect-error -- FIXME: TS2345
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

// export type CompilerOptions = HackOptions<BaseCompilerOptions>
export type TransformPreset = [NodeTransform[], Record<string, DirectiveTransform>]

export function getBaseTransformPreset(_prefixIdentifiers?: boolean): TransformPreset {
  return [
    [
      // transformVOnce,
      // transformVIf,
      // transformVFor,
      // transformSlotOutlet,
      // transformTemplateRef,
      // transformText,
      // transformElement,
      // transformVSlot,
      // transformComment,
      // transformChildren,
    ],
    {
      // bind: transformVBind,
      // on: transformVOn,
      // html: transformVHtml,
      // text: transformVText,
      // show: transformVShow,
      // model: transformVModel,
    }
  ]
}
