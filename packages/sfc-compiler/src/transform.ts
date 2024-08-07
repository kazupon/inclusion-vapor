// SPDX-License-Identifier: MIT
// Author: kazuya kawaguchi (a.k.a. kazupon)

// import generate from '@babel/generator'
// import { print as _generate } from 'code-red'
import {
  analyze,
  Scope,
  ScopeType,
  Variable,
  DefinitionType
} from '@typescript-eslint/scope-manager'
import {
  simpleTraverse,
  parse as _parseTsEslint,
  AST_NODE_TYPES
} from '@typescript-eslint/typescript-estree'
import { parse as parseBabel } from '@babel/parser'
import { MagicStringAST, generateTransform } from 'magic-string-ast'

import type { SvelteScript } from 'svelte-vapor-template-compiler'
import type { File as BabelFile, Node as BabelNode } from '@babel/types'

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
  enableParentableNodes(jsAst)

  const scopeManager = analyze(jsAst, { sourceType: 'module' })
  const scope = getScope(scopeManager, jsAst)
  const refVariables = getCanBeVaporRefVariables(scope)
  const jsStr = rewriteToVaporRef(refVariables, code, babelFileNode)

  // NOTE: avoid Maximum call stack size exceeded error with `code-red` print
  disableParentableNodes(jsAst)

  const sourceMap = !!options.sourcemap
  const id = options.id
  if (sourceMap) {
    if (!id) {
      throw new Error('`id` is required when `sourcemap` is enabled')
    }
    const gen = generateTransform(jsStr, id)
    if (gen == undefined) {
      throw new Error('Failed to generate source map')
    }
    return gen
  } else {
    return jsStr.toString()
  }
}

function rewriteToVaporRef(
  variables: Variable[],
  source: string,
  fileNode: BabelFile
): MagicStringAST {
  const s = new MagicStringAST(source)
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

function getCanBeVaporRefVariables(scope: Scope): Variable[] {
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
