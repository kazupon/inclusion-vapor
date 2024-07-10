import { parse } from 'svelte/compiler'
import { isString } from '@vue/shared'

import type { SvelteAst } from './ir'
import type { CompilerOptions, VaporCodegenResult } from '@vue-vapor/compiler-vapor'

// svelte-code/svelte-AST -> IR (transform) -> JS (generate)
export function compile(
  source: string | SvelteAst,
  _options: CompilerOptions = {} // TODO: maybe we need some svelte compiler options
): VaporCodegenResult {
  // TODO:
  const _ast = isString(source) ? parse(source) : source
  return {} as VaporCodegenResult
}
