import { compileScript as compileScriptVapor } from '@vue-vapor/compiler-sfc'

import type { SFCScriptCompileOptions, SFCDescriptor } from '@vue-vapor/compiler-sfc'
import type { SvelteSFCDescriptor, SvelteSFCScriptBlock } from './parse'

export function compileScript(
  sfc: SvelteSFCDescriptor,
  options: SFCScriptCompileOptions
): SvelteSFCScriptBlock {
  return compileScriptVapor(sfc as SFCDescriptor, options)
}
