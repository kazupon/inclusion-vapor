import { walkAST } from 'ast-kit'
import { isReference } from './reference.ts'

import type { Identifier, Node } from '@babel/types'

export interface Scope {
  parent: Scope | null
  block: boolean
  declarations: Map<string, Node>
  initDeclarations: Set<string>
  references: Set<string>
  addDeclaration(node: Node): void
  has(name: string): boolean
  findOwner(name: string): Scope | null
}

function createScope(parent: Scope | null, block: boolean): Readonly<Scope> {
  const declarations = new Map<string, Node>()
  const initDeclarations = new Set<string>()
  const references = new Set<string>()

  const scope = {
    parent,
    block,
    declarations,
    references,
    initDeclarations
  } as Scope

  function addDeclaration(node: Node): void {
    if (node.type === 'VariableDeclaration') {
      if (node.kind === 'var' && scope.block && scope.parent) {
        scope.parent.addDeclaration(node)
      } else {
        for (const declarator of node.declarations) {
          for (const name of extractNames(declarator.id)) {
            declarations.set(name, node)
            if (declarator.init) {
              initDeclarations.add(name)
            }
          }
        }
      }
    } else if (hasNameInId(node)) {
      declarations.set(node.id.name, node)
    }
  }

  function has(name: string): boolean {
    return declarations.has(name) || (!!scope.parent && scope.parent.has(name))
  }

  function findOwner(name: string): Scope | null {
    if (declarations.has(name)) {
      return scope
    }
    return scope.parent && scope.parent.findOwner(name)
  }

  scope.addDeclaration = addDeclaration
  scope.has = has
  scope.findOwner = findOwner

  return scope
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasNameInId(node: any): node is { id: { name: string } } {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
  return 'id' in node && node.id && 'name' in node.id
}

function extractNames(param: Node): string[] {
  return extractIdentifiers(param).map(node => node.name)
}

function extractIdentifiers(
  param: Node,
  nodes: (Node & { name: string })[] = []
): (Node & { name: string })[] {
  switch (param.type) {
    case 'Identifier': {
      nodes.push(param)
      break
    }

    case 'MemberExpression': {
      let object: Node = param
      while (object.type === 'MemberExpression') {
        object = object.object
      }
      nodes.push(object as Node & { name: string })
      break
    }

    case 'ObjectPattern': {
      for (const prop of param.properties) {
        extractIdentifiers(prop.type === 'RestElement' ? prop.argument : prop.value, nodes)
      }
      break
    }

    case 'ArrayPattern': {
      for (const element of param.elements) {
        if (element) {
          extractIdentifiers(element, nodes)
        }
      }
      break
    }

    case 'RestElement': {
      extractIdentifiers(param.argument, nodes)
      break
    }

    case 'AssignmentPattern': {
      extractIdentifiers(param.left, nodes)
      break
    }
  }

  return nodes
}

type ReturnAnalyzedScope = {
  map: WeakMap<Node, Scope>
  globals: Map<string, Node>
  scope: Scope
}

export function analyze(ast: Node): Readonly<ReturnAnalyzedScope> {
  const map = new WeakMap<Node, Scope>()
  const globals = new Map<string, Node>()
  const scope = createScope(null, false) // eslint-disable-line unicorn/no-null

  const references: [Scope, Identifier][] = []
  let currentScope = scope

  function push(node: Node, block: boolean): void {
    map.set(node, (currentScope = createScope(currentScope, block)))
  }

  function addReference(scope: Scope, name: string): void {
    scope.references.add(name)
    if (scope.parent) {
      addReference(scope.parent, name)
    }
  }

  walkAST(ast, {
    enter(node, parent) {
      // console.log('enter', node.type, parent == undefined ? '(null)' : parent.type)
      switch (node.type) {
        case 'Identifier': {
          if (parent && isReference(node, parent)) {
            references.push([currentScope, node])
          }
          break
        }
        case 'ImportSpecifier': {
          currentScope.declarations.set(node.local.name, node)
          break
        }
        case 'ExportNamedDeclaration': {
          if (node.source) {
            push(node, true)
            // map.set(node, (currentScope = new Scope(currentScope, true)))
            for (const specifier of node.specifiers) {
              if (specifier.type === 'ExportSpecifier') {
                currentScope.declarations.set(specifier.local.name, specifier)
              }
            }
            return
          }
          break
        }
        case 'FunctionExpression':
        case 'FunctionDeclaration':
        case 'ArrowFunctionExpression': {
          if (node.type === 'FunctionDeclaration') {
            if (node.id) {
              currentScope.declarations.set(node.id.name, node)
            }
            push(node, false)
          } else {
            push(node, false)
            if (node.type === 'FunctionExpression' && node.id) {
              currentScope.declarations.set(node.id.name, node)
            }
          }
          for (const param of node.params) {
            for (const name of extractNames(param)) {
              currentScope.declarations.set(name, node)
            }
          }
          break
        }
        case 'ForStatement':
        case 'ForInStatement':
        case 'ForOfStatement':
        case 'BlockStatement':
        case 'SwitchStatement': {
          push(node, true)
          break
        }
        case 'ClassDeclaration':
        case 'VariableDeclaration': {
          currentScope.addDeclaration(node)
          break
        }
        case 'CatchClause': {
          push(node, true)
          if (node.param) {
            for (const name of extractNames(node.param)) {
              if (node.param) {
                currentScope.declarations.set(name, node.param)
              }
            }
          }
          break
        }
      }
    },

    leave(node, _parent) {
      // console.log('leave', node.type, parent == undefined ? '(null)' : parent.type)
      if (map.has(node) && currentScope.parent) {
        currentScope = currentScope.parent
      }
    }
  })

  for (let i = references.length - 1; i >= 0; --i) {
    const [scope, reference] = references[i]
    if (!scope.references.has(reference.name)) {
      addReference(scope, reference.name)
    }
    if (!scope.findOwner(reference.name)) {
      globals.set(reference.name, reference)
    }
  }

  return {
    map,
    globals,
    scope
  }
}
