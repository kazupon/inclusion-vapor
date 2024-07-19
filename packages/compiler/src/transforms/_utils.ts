import { parse } from 'svelte/compiler'
import { generate } from '@vue-vapor/compiler-vapor'
import { transform } from '../transform'
import { IRNodeTypes } from '../ir'

import type {
  RootIRNode as VaporRootIRNode,
  CompilerOptions as VaporCompilerOptions
} from '@vue-vapor/compiler-vapor'
import type { CompilerOptions } from '../compile'
import type { RootNode } from '../ir'

export const DEFAULT_OPTIONS: CompilerOptions = {
  prefixIdentifiers: true
}
export const DEFAULT_VAPOR_COMPILER_OPTIONS = DEFAULT_OPTIONS as VaporCompilerOptions

export function makeCompile(options: CompilerOptions = {}) {
  return (source: string, overrideOptions: CompilerOptions = {}) => {
    const svelteAst = parse(source)

    const ast: RootNode = {
      type: IRNodeTypes.ROOT,
      children: svelteAst.html.children || [],
      source,
      components: [],
      directives: [],
      helpers: new Set(),
      temps: 0
    }

    const ir = transform(ast, {
      ...DEFAULT_OPTIONS,
      ...options,
      ...overrideOptions
    })
    const { code, helpers, vaporHelpers } = generate(ir as unknown as VaporRootIRNode, {
      ...DEFAULT_OPTIONS,
      ...options,
      ...overrideOptions
    })

    return { ast, ir, code, helpers, vaporHelpers }
  }
}
