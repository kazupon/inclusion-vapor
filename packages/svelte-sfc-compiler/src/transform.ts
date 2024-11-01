// SPDX-License-Identifier: MIT
// Author: kazuya kawaguchi (a.k.a. kazupon)

// import generate from '@babel/generator'
// import { print as _generate } from 'code-red'
import { parse as parseBabel } from '@babel/parser'
import { walkImportDeclaration } from 'ast-kit'
import { analyze, getReferences } from 'inclusion-vapor-shared'
import { generateTransform, MagicStringAST } from 'magic-string-ast'

import type {
  Identifier as BabelIdentifier,
  Node as BabelNode,
  Program as BabelProgram
} from '@babel/types'
import type { ImportBinding } from 'ast-kit'
import type { Scope, Variable } from 'inclusion-vapor-shared'
import type { SvelteScript } from 'svelte-vapor-template-compiler'

type GenerateMap = ReturnType<typeof MagicStringAST.prototype.generateMap>

export function transformSvelteVapor(code: string): { code: string; map: GenerateMap } {
  return {
    code,

    map: {} as unknown as GenerateMap
  }
}

/**
 * {@link transformSvelteScript} options
 */
export interface TransformSvelteScriptOptions {
  /**
   * Svelte Script AST
   * @default undefined
   */
  ast?: SvelteScript
  /**
   * Svelte script id. if you want to use source map, you should set this.
   * @default undefined
   */
  id?: string
  /**
   * Enable source map
   * @default false
   */
  sourcemap?: boolean
}

/**
 * Transform Svelte script to Vapor script
 *
 * @param {string} code - a string of svelte script
 * @param {TransformSvelteScriptOptions} options - {@link TransformSvelteScriptOptions | options}
 * @returns {string | ReturnType<typeof generateTransform>}
 */
// TODO: frientdly return type with infer from options
export function transformSvelteScript(
  code: string,
  options: TransformSvelteScriptOptions = {}
): string | { code: string; map: GenerateMap } {
  const babelFileNode = options.ast
    ? options.ast.content
    : parseBabel(code, { sourceType: 'module' })
  const jsAst = babelFileNode.program
  let strAst = new MagicStringAST(code)

  const { scope, firstNodeAfterImportDeclaration } = analyze(jsAst)

  const refVariables = getVaporRefVariables(scope)
  strAst = rewriteToVaporRef(code, refVariables, strAst, babelFileNode.start!)
  strAst = rewriteStore(scope, strAst, jsAst)
  strAst = rewriteProps(code, scope, strAst, firstNodeAfterImportDeclaration)

  const sourceMap = !!options.sourcemap
  const id = options.id
  if (sourceMap) {
    if (!id) {
      throw new Error('`id` is required when `sourcemap` is enabled')
    }
    const gen = generateTransform(strAst, id)
    if (gen == undefined) {
      throw new Error('Failed to generate source map')
    }
    return gen
  } else {
    return strAst.toString()
  }
}

function rewriteProps(
  code: string,
  scope: Scope,
  s: MagicStringAST,
  firstNodeAfterImportDeclaration?: BabelNode
): MagicStringAST {
  /**
   * collect export and remove variables
   */
  const removableDeclarations = new Set<BabelNode>()
  const exportWritableVariables: Variable[] = []
  const exportReadableVariables: Variable[] = []
  for (const variable of scope.variables.values()) {
    if (variable.export == undefined) {
      continue
    } else {
      removableDeclarations.add(variable.export)
      removableDeclarations.add(variable.declaration)
      if (variable.definition.kind === 'let') {
        exportWritableVariables.push(variable)
      } else if (variable.definition.kind === 'const') {
        exportReadableVariables.push(variable)
      }
    }
  }

  /**
   * adjust order by definition node start position
   */
  for (const variables of [exportWritableVariables, exportReadableVariables]) {
    variables.sort((a, b) => a.definition.node.start! - b.definition.node.start!)
  }

  /**
   * generate code
   */
  const codes: string[] = []
  if (exportWritableVariables.length > 0) {
    for (const variable of exportWritableVariables) {
      let defaultValue = ''
      if (variable.definition.node.type === 'VariableDeclarator' && variable.definition.node.init) {
        defaultValue = code.slice(
          variable.definition.node.init.start!,
          variable.definition.node.init.end!
        )
      }
      codes.push(
        `const ${variable.name} = defineModel('${variable.name}'${defaultValue ? `, { default: ${defaultValue} }` : ''})`
      )
    }
  }
  if (exportReadableVariables.length > 0) {
    // eslint-disable-next-line unicorn/no-array-reduce
    const exportReadableProps = exportReadableVariables.reduce((acc, variable) => {
      return variable.definition.node.type === 'VariableDeclarator' && variable.definition.node.init
        ? [
            ...acc,
            `${variable.name} = ${code.slice(variable.definition.node.init.start!, variable.definition.node.init.end!)}`
          ]
        : [...acc, variable.name]
    }, [] as string[])
    codes.push(
      `const { ${exportReadableProps.join(', ')} } = defineProps([${exportReadableVariables.map(variable => `'${variable.name}'`).join(', ')}])`
    )
  }

  /**
   * remove unnecessary variables
   */
  removableDeclarations.forEach(declaration => s.removeNode(declaration))

  /**
   * insert code to the first node after import declaration
   */
  if (firstNodeAfterImportDeclaration) {
    s.prepend(codes.join('\n'))
  }

  return s
}

function rewriteStore(scope: Scope, s: MagicStringAST, program: BabelProgram): MagicStringAST {
  for (const node of program.body) {
    switch (node.type) {
      case 'ImportDeclaration': {
        if (node.source.value === 'svelte') {
          const source = node.source
          s.overwrite(source.start!, source.end!, `'svelte-vapor-runtime'`)
        } else if (node.source.value === 'svelte/store') {
          const declarationNode = node
          const imports: Record<string, ImportBinding> = {}
          walkImportDeclaration(imports, declarationNode)
          const specifiers = Object.keys(imports)
          if (specifiers.includes('writable')) {
            specifiers.push('useWritableStore')
          }
          if (specifiers.includes('readable')) {
            specifiers.push('useReadableStore')
          }
          const variables = getVaporStoreVariables(scope, imports)
          const references = getVaporStoreConvertableVariables(scope, variables)
          insertStoreComposable(s, variables)
          replaceStoreIdentifier(s, references)
          s.overwrite(
            declarationNode.start!,
            declarationNode.end!,
            `import { ${specifiers.join(', ')} } from 'svelte-vapor-runtime/store'`
          )
        }
        break
      }
    }
  }

  return s
}

function rewriteToVaporRef(
  code: string,
  variables: Variable[],
  s: MagicStringAST,
  offset: number
): MagicStringAST {
  let importRef = false
  for (const variable of variables) {
    const def = variable.definition.node
    if (
      variable.export == undefined &&
      def.type === 'VariableDeclarator' &&
      def.init != undefined &&
      validateNodeTypeForVaporRef(def.init)
    ) {
      s.overwriteNode(
        normalizeBabelNodeOffset(def.init, offset),
        `ref(${code.slice(def.init.start! - offset, def.init.end! - offset)})`
      )
      importRef = true
    } else {
      continue
    }

    const refs = getReferences(variable)
    for (const ref of refs) {
      s.overwriteNode(normalizeBabelNodeOffset(ref, offset), `${ref.name}.value`)
    }
  }

  if (importRef) {
    s.prepend(`import { ref } from 'vue/vapor'\n`)
  }

  return s
}

function validateNodeTypeForVaporRef(node: BabelNode): boolean {
  return (
    node.type === 'NumericLiteral' ||
    node.type === 'StringLiteral' ||
    node.type === 'BooleanLiteral' ||
    node.type === 'NullLiteral' ||
    node.type === 'BigIntLiteral' ||
    node.type === 'DecimalLiteral' ||
    node.type === 'RegExpLiteral' ||
    node.type === 'TemplateLiteral' ||
    node.type === 'ArrayExpression' ||
    node.type === 'ObjectExpression' ||
    node.type === 'NewExpression'
  )
}

function normalizeBabelNodeOffset(node: BabelNode, offset: number): BabelNode {
  return {
    ...node,
    start: node.start! - offset,
    end: node.end! - offset
  }
}

function getVaporRefVariables(scope: Scope): Variable[] {
  return [...scope.variables.values()].filter(variable => {
    return variable.definition.node.type === 'VariableDeclarator'
  })
}

function getVaporStoreVariables(scope: Scope, imports: Record<string, ImportBinding>): Variable[] {
  const variables = [] as Variable[]
  for (const [name] of Object.entries(imports)) {
    for (const variable of scope.variables.values()) {
      const def = variable.definition.node
      if (
        variable.name !== name &&
        def.type === 'VariableDeclarator' &&
        def.init &&
        def.init.type === 'CallExpression' &&
        def.init.callee.type === 'Identifier' &&
        def.init.callee.name === name
      ) {
        variables.push(variable)
      }
    }
  }
  return variables
}

function getVaporStoreConvertableVariables(scope: Scope, variables: Variable[]): BabelIdentifier[] {
  // eslint-disable-next-line unicorn/no-array-reduce
  return variables.reduce((acc, variable) => {
    return [...acc, ...collectReferences(scope, `$${variable.name}`)]
  }, [] as BabelIdentifier[])
}

function collectReferences(scope: Scope, name: string): BabelIdentifier[] {
  const refs = scope.references.filter(ref => ref.name === name) || []
  // eslint-disable-next-line unicorn/no-array-reduce
  return scope.children.reduce(
    (acc, child) => {
      return [...acc, ...collectReferences(child, name)]
    },
    [...refs] as BabelIdentifier[]
  )
}

function insertStoreComposable(s: MagicStringAST, variables: Variable[]): void {
  function makeComposable(variable: Variable, node: BabelIdentifier): string {
    return `\nconst $${variable.name} = ${node.name === 'writable' ? 'useWritableStore' : 'useReadableStore'}(${variable.name})`
  }
  for (const variable of variables) {
    const def = variable.definition.node
    if (
      def.type === 'VariableDeclarator' &&
      def.init &&
      def.init.type === 'CallExpression' &&
      def.init.callee.type === 'Identifier'
    ) {
      s.appendRight(def.end!, makeComposable(variable, def.init.callee))
    }
  }
}

function replaceStoreIdentifier(s: MagicStringAST, references: BabelIdentifier[]): void {
  for (const ref of references) {
    s.overwrite(ref.start!, ref.end!, `${ref.name}.value`)
  }
}
