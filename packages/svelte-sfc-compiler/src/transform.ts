// SPDX-License-Identifier: MIT
// Author: kazuya kawaguchi (a.k.a. kazupon)

// import generate from '@babel/generator'
// import { print as _generate } from 'code-red'
import { parse as parseBabel } from '@babel/parser'
import { analyze, DefinitionType, ScopeType } from '@typescript-eslint/scope-manager'
import { AST_NODE_TYPES, simpleTraverse } from '@typescript-eslint/typescript-estree'
import { walkImportDeclaration } from 'ast-kit'
import { generateTransform, MagicStringAST } from 'magic-string-ast'

import type {
  File as BabelFile,
  ImportDeclaration as BabelImportDeclaration,
  Node as BabelNode
} from '@babel/types'
import type { Reference, Scope, Variable } from '@typescript-eslint/scope-manager'
import type { parse as _parseTsEslint, TSESTree } from '@typescript-eslint/typescript-estree'
import type { ImportBinding } from 'ast-kit'
import type { SvelteScript } from 'svelte-vapor-template-compiler'

type TSESLintNode = ReturnType<typeof _parseTsEslint>
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
    : parseBabel(code, { sourceType: 'module', plugins: ['estree'] })
  const jsAst = babelFileNode.program as unknown as TSESLintNode
  let strAst = new MagicStringAST(code)
  enableParentableNodes(jsAst)

  const scopeManager = analyze(jsAst, { sourceType: 'module' })
  const scope = getScope(scopeManager, jsAst)
  const refVariables = getVaporRefVariables(scope)
  strAst = rewriteStore(scope, strAst, jsAst)
  strAst = rewriteToVaporRef(refVariables, strAst, babelFileNode)

  // NOTE: avoid Maximum call stack size exceeded error with `code-red` print
  disableParentableNodes(jsAst)

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

function rewriteStore(scope: Scope, s: MagicStringAST, program: TSESLintNode): MagicStringAST {
  for (const node of program.body) {
    switch (node.type) {
      case AST_NODE_TYPES.ImportDeclaration: {
        if (node.source.value === 'svelte') {
          const source = node.source as unknown as BabelNode
          s.overwrite(source.start!, source.end!, `'svelte-vapor-runtime'`)
        } else if (node.source.value === 'svelte/store') {
          const declarationNode = node as unknown as BabelImportDeclaration
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
  variables: Variable[],
  s: MagicStringAST,
  fileNode: BabelFile
): MagicStringAST {
  const offset = fileNode.start!
  for (const variable of variables) {
    const def = variable.defs[0]
    let importRef = false
    if (
      def.node.type === AST_NODE_TYPES.VariableDeclarator &&
      def.node.init &&
      def.node.init.type === AST_NODE_TYPES.Literal
    ) {
      s.overwriteNode(
        normalizeBabelNodeOffset(def.node.init as unknown as BabelNode, offset),
        `ref(${def.node.init.raw})`
      )
      importRef = true
    }
    if (importRef) {
      s.prepend(`import { ref } from 'vue/vapor'\n`)
    }
    const refs = variable.references.filter(
      ref =>
        ref.identifier !== variable.identifiers[0] &&
        ref.resolved?.identifiers[0] === variable.identifiers[0]
    )
    for (const ref of refs) {
      s.overwriteNode(
        normalizeBabelNodeOffset(ref.identifier as unknown as BabelNode, offset),
        `${ref.identifier.name}.value`
      )
    }
  }
  return s
}

function normalizeBabelNodeOffset(node: BabelNode, offset: number): BabelNode {
  return {
    ...node,
    start: node.start! - offset,
    end: node.end! - offset
  }
}

function getVaporStoreVariables(scope: Scope, imports: Record<string, ImportBinding>): Variable[] {
  const variables = [] as Variable[]
  for (const [name] of Object.entries(imports)) {
    for (const variable of scope.variables) {
      if (
        variable.name !== name &&
        variable.references[0] &&
        variable.references[0].writeExpr &&
        variable.references[0].writeExpr.type === AST_NODE_TYPES.CallExpression &&
        variable.references[0].writeExpr.callee.type === AST_NODE_TYPES.Identifier &&
        variable.references[0].writeExpr.callee.name === name
      ) {
        variables.push(variable)
      }
    }
  }
  return variables
}

function getVaporStoreConvertableVariables(scope: Scope, variables: Variable[]): Reference[] {
  let ret = [] as Reference[]
  for (const variable of variables) {
    const targets = scope.references.filter(
      ref =>
        ref.identifier.type === AST_NODE_TYPES.Identifier &&
        ref.identifier.name === `$${variable.name}`
    )
    if (targets.length > 0) {
      ret = [...ret, ...targets]
    }
  }
  return ret
}

function insertStoreComposable(s: MagicStringAST, variables: Variable[]): void {
  function makeComposable(variable: Variable, node: TSESTree.Identifier): string {
    return `\nconst $${variable.name} = ${node.name === 'writable' ? 'useWritableStore' : 'useReadableStore'}(${variable.name})`
  }
  for (const variable of variables) {
    for (const ref of variable.references) {
      if (
        ref.writeExpr &&
        ref.writeExpr.type === AST_NODE_TYPES.CallExpression &&
        ref.writeExpr.callee.type === AST_NODE_TYPES.Identifier
      ) {
        const source = ref.writeExpr as unknown as BabelNode
        s.appendRight(source.end!, makeComposable(variable, ref.writeExpr.callee))
      }
    }
  }
}

function replaceStoreIdentifier(s: MagicStringAST, references: Reference[]): void {
  for (const ref of references) {
    const source = ref.identifier as unknown as BabelNode
    s.overwrite(source.start!, source.end!, `${ref.identifier.name}.value`)
  }
}

function getVaporRefVariables(scope: Scope): Variable[] {
  return scope.variables.filter(variable => {
    if (variable.defs[0]) {
      const def = variable.defs[0]
      if (
        def.type === DefinitionType.Variable &&
        def.name.type === AST_NODE_TYPES.Identifier &&
        def.node.type === AST_NODE_TYPES.VariableDeclarator &&
        def.node.init &&
        def.node.init.type === AST_NODE_TYPES.Literal
      ) {
        return variable
      }
    }
  })
}

function enableParentableNodes(node: TSESLintNode) {
  simpleTraverse(node, {
    enter(node, parent) {
      if (parent) {
        node.parent = parent
      }
    }
  })
}

function disableParentableNodes(node: TSESLintNode) {
  simpleTraverse(node, {
    enter(node) {
      if (node.parent) {
        // @ts-expect-error -- NOTE
        delete node.parent
      }
    }
  })
}

function getScope(manager: ReturnType<typeof analyze>, node: TSESLintNode): Scope {
  const scope = manager.acquire(node, true)
  if (scope) {
    if (scope.type === ScopeType.functionExpressionName) {
      return scope.childScopes[0]
    }
    return scope
  }
  return manager.scopes[0]
}
