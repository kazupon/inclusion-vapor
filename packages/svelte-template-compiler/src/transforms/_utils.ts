import { generate } from '@vue-vapor/compiler-vapor'
import { parse } from 'svelte/compiler'
import { IRNodeTypes } from '../ir/index.ts'
import { transform } from '../transform.ts'

import type {
  CompilerOptions as VaporCompilerOptions,
  RootIRNode as VaporRootIRNode
} from '@vue-vapor/compiler-vapor'
import type { CompilerOptions } from '../compile.ts'
import type { RootIRNode, RootNode } from '../ir/index.ts'

export const DEFAULT_OPTIONS: CompilerOptions = {
  prefixIdentifiers: true
}
export const DEFAULT_VAPOR_COMPILER_OPTIONS = DEFAULT_OPTIONS as VaporCompilerOptions

export function makeCompile(options: CompilerOptions = {}) {
  return (
    source: string,
    overrideOptions: CompilerOptions = {}
  ): {
    ast: RootNode
    ir: RootIRNode
    code: string
    helpers: Set<string>
    vaporHelpers: Set<string>
  } => {
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
