import { parse } from '@babel/parser'
import { generate } from '@vue-vapor/compiler-vapor'
import { IRNodeTypes } from '../ir/index.ts'
import { transform } from '../transform.ts'

import type {
  CompilerOptions as VaporCompilerOptions,
  RootIRNode as VaporRootIRNode
} from '@vue-vapor/compiler-vapor'
import type { CompilerOptions } from '../compile.ts'
import type { JSXElement, JSXFragment, RootIRNode, RootNode } from '../ir/index.ts'

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
    const {
      body: [statement]
    } = parse(source, {
      sourceType: 'module',
      plugins: ['jsx']
    }).program
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
