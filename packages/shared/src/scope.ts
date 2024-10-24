// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)

import { walkAST as walk } from 'ast-kit'

import type { Identifier, Node } from '@babel/types'

export interface Variable {
  name: string
  node: Node
  references: Set<Identifier>
}

export interface Scope {
  parent: Scope | null
  block: Node
  variables: Map<string, Variable>
  initVariables: Set<string>
  references: Identifier[]
  addVariable(node: Node, name?: string): void
  hasVariable(name: string, ancestor?: boolean): boolean
  getVariable(name: string): Variable | undefined
  findOwner(name: string): Scope | null
}

function createScope(parent: Scope | null, block: Node): Readonly<Scope> {
  const variables = new Map<string, Variable>()
  const initVariables = new Set<string>()
  const references = [] as Identifier[]

  const scope = {
    parent,
    block,
    references,
    variables,
    initVariables
  } as Scope

  function createVariable(name: string, node: Identifier): Variable {
    const references = new Set<Identifier>()
    return { name, node, references }
  }

  function addVariable(node: Node, name?: string): void {
    if (name) {
      scope.variables.set(name, createVariable(name, node as Identifier))
      return
    }

    switch (node.type) {
      case 'VariableDeclaration': {
        if (node.kind === 'var' && scope.block && scope.parent) {
          scope.parent.addVariable(node)
        } else {
          for (const declarator of node.declarations) {
            for (const extract of extractNames(declarator.id)) {
              scope.variables.set(
                extract.name,
                createVariable(extract.name, extract.node as Identifier)
              )
              if (declarator.init) {
                scope.initVariables.add(extract.name)
              }
            }
          }
        }
        break
      }
      case 'ImportDefaultSpecifier':
      case 'ImportSpecifier': {
        scope.variables.set(node.local.name, createVariable(node.local.name, node.local))
        break
      }
      case 'ExportDefaultDeclaration': {
        // TODO:
        break
      }
      case 'ExportNamedDeclaration': {
        for (const specifier of node.specifiers) {
          if (specifier.type === 'ExportSpecifier') {
            scope.variables.set(
              specifier.local.name,
              createVariable(specifier.local.name, specifier.local)
            )
          }
        }
        break
      }
      case 'FunctionDeclaration':
      case 'FunctionExpression': {
        if (node.id) {
          scope.variables.set(node.id.name, createVariable(node.id.name, node.id))
        }
        break
      }
      default: {
        if (hasNameInId(node)) {
          scope.variables.set(node.id.name, createVariable(node.id.name, node.id))
        }
        break
      }
    }
  }

  function hasVariable(name: string, ancestor?: boolean): boolean {
    const track = typeof ancestor === 'boolean' ? ancestor : true
    return scope.variables.has(name) || (track && !!scope.parent && scope.parent.hasVariable(name))
  }

  function getVariable(name: string): Variable | undefined {
    return scope.variables.get(name)
  }

  function findOwner(name: string): Scope | null {
    if (scope.variables.has(name)) {
      return scope
    }
    return scope.parent && scope.parent.findOwner(name)
  }

  scope.addVariable = addVariable
  scope.hasVariable = hasVariable
  scope.getVariable = getVariable
  scope.findOwner = findOwner

  return scope
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasNameInId(node: any): node is { id: { name: string } } {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
  return 'id' in node && node.id && 'name' in node.id
}

function extractNames(param: Node): { node: Node; name: string }[] {
  return extractIdentifiers(param).map(node => ({ node, name: node.name }))
}

function isReference(node: Node, parent?: Node): boolean {
  if (node.type === 'MemberExpression') {
    return !node.computed && isReference(node.object, node)
  }

  if (node.type === 'Identifier') {
    if (!parent) {
      return true
    }

    switch (parent.type) {
      // disregard `bar` in `foo.bar`
      case 'MemberExpression': {
        return parent.computed || node === parent.object
      }

      // disregard the `foo` in `class {foo(){}}` but keep it in `class {[foo](){}}`
      case 'ClassMethod': {
        return parent.computed
      }

      // disregard the `foo` in `class {foo=bar}` but keep it in `class {[foo]=bar}` and `class {bar=foo}`
      case 'ClassProperty': {
        return parent.computed || node === parent.value
      }

      // disregard the `bar` in `{ bar: foo }`, but keep it in `{ [bar]: foo }`
      case 'ObjectProperty': {
        return parent.computed || node === parent.value
      }

      // disregard the `bar` in `export { foo as bar }` or
      // the foo in `import { foo as bar }`
      case 'ExportSpecifier':
      case 'ImportSpecifier': {
        return node === parent.local
      }

      // disregard the `foo` in `foo: while (...) { ... break foo; ... continue foo;}`
      case 'LabeledStatement':
      case 'BreakStatement':
      case 'ContinueStatement': {
        return false
      }
      default: {
        return true
      }
    }
  }

  return false
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
  const scope = createScope(null, ast) // eslint-disable-line unicorn/no-null

  const references: [Scope, Identifier][] = []
  let currentScope = scope

  function push(node: Node): void {
    map.set(node, (currentScope = createScope(currentScope, node)))
  }

  function addReference(scope: Scope, node: Identifier): void {
    scope.references.push(node)
  }

  walk(ast, {
    enter(node, parent) {
      // console.log('enter', node.type, parent == undefined ? '(null)' : parent.type)
      switch (node.type) {
        case 'Identifier': {
          if (parent && isReference(node, parent)) {
            references.push([currentScope, node])
          }
          break
        }
        case 'ImportDefaultSpecifier':
        case 'ImportSpecifier': {
          currentScope.addVariable(node)
          break
        }
        case 'ExportDefaultDeclaration': {
          // TODO:
          break
        }
        case 'ExportNamedDeclaration': {
          push(node)
          currentScope.addVariable(node)
          break
        }
        case 'FunctionExpression':
        case 'FunctionDeclaration':
        case 'ArrowFunctionExpression': {
          if (node.type === 'FunctionDeclaration') {
            currentScope.addVariable(node)
            push(node)
          } else {
            push(node)
            currentScope.addVariable(node)
          }
          for (const param of node.params) {
            for (const { node, name } of extractNames(param)) {
              currentScope.addVariable(node, name)
            }
          }
          break
        }
        case 'ForStatement':
        case 'ForInStatement':
        case 'ForOfStatement':
        case 'BlockStatement':
        case 'SwitchStatement': {
          push(node)
          break
        }
        case 'ClassDeclaration':
        case 'VariableDeclaration': {
          currentScope.addVariable(node)
          break
        }
        case 'CatchClause': {
          push(node)
          if (node.param) {
            for (const extract of extractNames(node.param as Node)) {
              if (extract.node) {
                currentScope.addVariable(extract.node, extract.name)
              }
            }
          }
          break
        }
      }
    },

    leave(node, _parent) {
      // console.log('leave', node.type, _parent == undefined ? '(null)' : _parent.type)
      if (map.has(node) && currentScope.parent) {
        currentScope = currentScope.parent
      }
    }
  })

  for (let i = references.length - 1; i >= 0; --i) {
    const [scope, reference] = references[i]
    addReference(scope, reference)

    const owner = scope.findOwner(reference.name)
    if (owner) {
      const variable = owner.getVariable(reference.name)
      if (variable && variable.name === reference.name) {
        variable.references.add(reference)
      }
    } else {
      globals.set(reference.name, reference)
    }
  }

  return {
    map,
    globals,
    scope
  }
}
