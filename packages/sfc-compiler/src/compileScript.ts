// SPDX-License-Identifier: MIT
// Author: kazuya kawaguchi (a.k.a. kazupon)

import { compileScript as compileScriptVapor } from '@vue-vapor/compiler-sfc'

import type { SFCDescriptor } from '@vue-vapor/compiler-sfc'
import type {
  SvelteSFCDescriptor,
  SvelteSFCScriptBlock,
  SvelteSFCScriptCompileOptions
} from './types'

export function compileScript(
  sfc: SvelteSFCDescriptor,
  options: SvelteSFCScriptCompileOptions
): SvelteSFCScriptBlock {
  // @ts-expect-error -- FIXME
  return compileScriptVapor(sfc as SFCDescriptor, options)
}
