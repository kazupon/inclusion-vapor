// import generate from '@babel/generator'
import { print as generate } from 'code-red'
import {
  analyze,
  Scope,
  ScopeType,
  Variable,
  DefinitionType
} from '@typescript-eslint/scope-manager'
import {
  simpleTraverse,
  parse as parseTsEslint,
  AST_NODE_TYPES
} from '@typescript-eslint/typescript-estree'
import { MagicStringAST } from 'magic-string-ast'

import type { SvelteScript } from './compiler'
import type { File as BabelFile, Node as BabelNode } from '@babel/types'

type TSESLintNode = ReturnType<typeof parseTsEslint>

export function transformSvelteVapor(code: string): ReturnType<typeof generate> {
  return {
    code,
    map: {}
  }
}

export function transformSvelteScript(script: SvelteScript, code: string): string {
  const babelFileNode = script.content as unknown as BabelFile
  const jsAst = babelFileNode.program as unknown as TSESLintNode
  enableParentableNodes(jsAst)

  const scopeManager = analyze(jsAst, { sourceType: 'module' })
  const scope = getScope(scopeManager, jsAst)
  const refVariables = getCanBeVaporRefVariables(scope)
  const jsStr = rewriteToVaporRef(refVariables, code, babelFileNode)

  // NOTE: avoid Maximum call stack size exceeded error with `code-red` print
  disableParentableNodes(jsAst)

  return jsStr.toString()
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
