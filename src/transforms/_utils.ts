import { parse } from 'svelte/compiler'
import { generate } from '@vue-vapor/compiler-vapor'
import { transform } from '../transform'
import { IRNodeTypes } from '../ir'

import type { RootIRNode as VaporRootIRNode } from '@vue-vapor/compiler-vapor'
import type { CompilerOptions } from '../compile'
import type { RootNode } from '../ir'

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
      prefixIdentifiers: true,
      ...options,
      ...overrideOptions
    })
    const { code, helpers, vaporHelpers } = generate(ir as unknown as VaporRootIRNode, {
      prefixIdentifiers: true,
      ...options,
      ...overrideOptions
    })

    return { ast, ir, code, helpers, vaporHelpers }
  }
}
