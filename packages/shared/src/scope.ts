// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)

import { walkAST as walk } from 'ast-kit'

import type { Identifier, Node } from '@babel/types'

export type DefinitionKind = 'var' | 'let' | 'const' | 'import' | 'function' | 'class' | 'catch'

export interface Definition {
  node: Node
  kind: DefinitionKind
}

export interface Variable {
  name: string
  identifier: Identifier
  definition: Definition
  references: Set<Identifier>
}

export interface Scope {
  parent: Scope | null
  children: Scope[]
  block: Node
  variables: Map<string, Variable>
  references: Identifier[]
  addVariable(node: Node, def?: Definition, name?: string): void
  hasVariable(name: string, ancestor?: boolean): boolean
  getVariable(name: string): Variable | undefined
  findOwner(name: string): Scope | null
}

function createScope(parent: Scope | null, block: Node): Readonly<Scope> {
  const variables = new Map<string, Variable>()
  const references = [] as Identifier[]
  const children = [] as Scope[]

  const scope = {
    parent,
    children,
    block,
    references,
    variables
  } as Scope

  function createVariable(name: string, id: Identifier, def: Definition): Variable {
    const references = new Set<Identifier>()
    return { name, identifier: id, definition: def, references }
  }

  function addVariable(node: Node, def?: Definition, name?: string): void {
    if (name && def && node.type === 'Identifier') {
      scope.variables.set(name, createVariable(name, node, def))
      return
    }

    switch (node.type) {
      case 'VariableDeclaration': {
        // TODO: more strictly handle `var` case
        if (node.kind === 'var' && scope.block && scope.parent) {
          scope.parent.addVariable(node)
        } else {
          for (const declarator of node.declarations) {
            for (const extract of extractNames(declarator.id)) {
              scope.variables.set(
                extract.name,
                createVariable(extract.name, extract.node as Identifier, {
                  node: declarator,
                  kind: node.kind as DefinitionKind
                })
              )
            }
          }
        }
        break
      }
      case 'ImportDefaultSpecifier':
      case 'ImportSpecifier': {
        scope.variables.set(node.local.name, createVariable(node.local.name, node.local, def!))
        break
      }
      case 'FunctionDeclaration':
      case 'FunctionExpression': {
        if (node.id) {
          scope.variables.set(node.id.name, createVariable(node.id.name, node.id, def!))
        }
        break
      }
      default: {
        if (hasNameInId(node)) {
          scope.variables.set(node.id.name, createVariable(node.id.name, node.id, def!))
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

      // disregard the foo in `import { foo as bar }`
      case 'ImportSpecifier': {
        return node === parent.local
      }

      // disregard the `bar` in `export { foo as bar }`
      case 'ExportSpecifier': {
        return node === parent.local
      }

      // disregard the `function foo() { ... }`
      case 'FunctionDeclaration': {
        return node !== parent.id
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

  function addScope(node: Node): void {
    const scope = createScope(currentScope, node)
    currentScope.children.push(scope)
    map.set(node, (currentScope = scope))
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
          currentScope.addVariable(node, { node: parent!, kind: 'import' })
          break
        }
        case 'ExportNamedDeclaration': {
          if (node.specifiers.length > 0) {
            addScope(node)
          }
          currentScope.addVariable(node)
          break
        }
        case 'FunctionDeclaration':
        case 'FunctionExpression':
        case 'ArrowFunctionExpression': {
          currentScope.addVariable(node, { node, kind: 'function' })
          addScope(node)
          for (const param of node.params) {
            for (const extract of extractNames(param)) {
              currentScope.addVariable(extract.node, { node, kind: 'function' }, extract.name)
            }
          }
          break
        }
        case 'ForStatement':
        case 'ForInStatement':
        case 'ForOfStatement':
        case 'BlockStatement': {
          // skip under function
          if (
            parent &&
            (parent.type === 'FunctionDeclaration' ||
              parent.type === 'FunctionExpression' ||
              parent.type === 'ArrowFunctionExpression' ||
              parent.type === 'CatchClause')
          ) {
            return
          }
          addScope(node)
          break
        }
        case 'SwitchStatement': {
          addScope(node)
          break
        }
        case 'ClassDeclaration': {
          currentScope.addVariable(node, { node, kind: 'class' })
          break
        }
        case 'VariableDeclaration': {
          currentScope.addVariable(node, { node, kind: node.kind as DefinitionKind })
          break
        }
        case 'CatchClause': {
          addScope(node)
          if (node.param) {
            for (const extract of extractNames(node.param as Node)) {
              if (extract.node) {
                currentScope.addVariable(extract.node, { node, kind: 'catch' }, extract.name)
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

export function getReferences(variable: Variable, exclude = true): Identifier[] {
  const references = [...variable.references]
  return exclude ? references.filter(ref => ref !== variable.identifier) : references
}
