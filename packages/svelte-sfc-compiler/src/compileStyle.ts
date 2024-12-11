// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-sfc`
// Author: Evan you (https://github.com/yyx990803)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-sfc/src/compileStyle.ts

import type {
  SvelteSFCAsyncStyleCompileOptions,
  SvelteSFCStyleCompileOptions,
  SvelteSFCStyleCompileResults
} from './types.ts'

export function compileStyle(options: SvelteSFCStyleCompileOptions): SvelteSFCStyleCompileResults {
  return doCompileStyle({
    ...options,
    isAsync: false
  }) as SvelteSFCStyleCompileResults
}

export function compileStyleAsync(
  options: SvelteSFCAsyncStyleCompileOptions
): Promise<SvelteSFCStyleCompileResults> {
  return doCompileStyle({
    ...options,
    isAsync: true
  }) as Promise<SvelteSFCStyleCompileResults>
}
export function doCompileStyle(
  _options: SvelteSFCAsyncStyleCompileOptions
): SvelteSFCStyleCompileResults | Promise<SvelteSFCStyleCompileResults> {
  // TODO:

  return {
    errors: []
  } as unknown as SvelteSFCStyleCompileResults
}
