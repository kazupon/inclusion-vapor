// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)

import { walkAST as walk } from 'ast-kit'

import type {
  ExportDeclaration,
  ExportDefaultDeclaration,
  ExportNamedDeclaration,
  Identifier,
  LabeledStatement,
  Node
} from '@babel/types'

export type DefinitionKind = 'var' | 'let' | 'const' | 'import' | 'function' | 'class' | 'catch'

export interface Definition {
  node: Node
  kind: DefinitionKind
}

export interface Variable {
  name: string
  identifier: Identifier
  definition: Definition
  export?: ExportDefaultDeclaration | ExportNamedDeclaration
  declaration: Node
  references: Set<Identifier>
}

export interface Scope {
  parent: Scope | null
  children: Scope[]
  block: Node
  variables: Map<string, Variable>
  references: Identifier[]
  labels: LabeledStatement[]
  addVariable(node: Node, context: AddVariableContext): void
  hasVariable(name: string, ancestor?: boolean): boolean
  getVariable(name: string): Variable | undefined
  findOwner(name: string): Scope | null
}

export interface AddVariableContext {
  name?: string
  definition?: Definition
  declaration?: Node
}

const NULL_ADD_VARIABLE_CONTEXT = {} satisfies AddVariableContext

function createScope(parent: Scope | null, block: Node): Readonly<Scope> {
  const variables = new Map<string, Variable>()
  const references = [] as Identifier[]
  const children = [] as Scope[]
  const labels = [] as LabeledStatement[]

  const scope = {
    parent,
    children,
    block,
    references,
    labels,
    variables
  } as Scope

  function createVariable(
    name: string,
    id: Identifier,
    def: Definition,
    declaration: Node
  ): Variable {
    const references = new Set<Identifier>()
    return { name, identifier: id, definition: def, declaration, references }
  }

  function addVariable(node: Node, context: AddVariableContext = {}): void {
    if (context.name && context.definition && node.type === 'Identifier') {
      scope.variables.set(
        context.name,
        createVariable(context.name, node, context.definition, context.declaration!)
      )
      return
    }

    switch (node.type) {
      case 'VariableDeclaration': {
        // TODO: more strictly handle `var` case
        if (node.kind === 'var' && scope.block && scope.parent) {
          scope.parent.addVariable(node, { ...NULL_ADD_VARIABLE_CONTEXT, declaration: node })
        } else {
          for (const declarator of node.declarations) {
            for (const extract of extractNames(declarator.id)) {
              scope.variables.set(
                extract.name,
                createVariable(
                  extract.name,
                  extract.node as Identifier,
                  {
                    node: declarator,
                    kind: node.kind as DefinitionKind
                  },
                  node
                )
              )
            }
          }
        }
        break
      }
      case 'ImportDefaultSpecifier':
      case 'ImportSpecifier': {
        scope.variables.set(
          node.local.name,
          createVariable(node.local.name, node.local, context.definition!, context.declaration!)
        )
        break
      }
      case 'FunctionDeclaration':
      case 'FunctionExpression': {
        if (node.id) {
          scope.variables.set(
            node.id.name,
            createVariable(node.id.name, node.id, context.definition!, context.declaration!)
          )
        }
        break
      }
      default: {
        if (hasNameInId(node)) {
          scope.variables.set(
            node.id.name,
            createVariable(node.id.name, node.id, context.definition!, context.declaration!)
          )
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
  firstNodeAfterImportDeclaration?: Node
}

export function analyze(ast: Node): Readonly<ReturnAnalyzedScope> {
  const map = new WeakMap<Node, Scope>()
  const globals = new Map<string, Node>()
  const scope = createScope(null, ast) // eslint-disable-line unicorn/no-null

  let currentScope = scope
  const references: [Scope, Identifier][] = []
  const exportDeclarations: ExportDeclaration[] = []

  function addScope(node: Node): void {
    const scope = createScope(currentScope, node)
    currentScope.children.push(scope)
    map.set(node, (currentScope = scope))
  }

  function addReference(scope: Scope, node: Identifier): void {
    scope.references.push(node)
  }

  function addLabel(scope: Scope, node: LabeledStatement): void {
    scope.labels.push(node)
  }

  /**
   * analyze main
   */

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
          currentScope.addVariable(node, {
            definition: { node: parent!, kind: 'import' },
            declaration: parent!
          })
          break
        }
        case 'ExportDefaultDeclaration':
        case 'ExportNamedDeclaration': {
          exportDeclarations.push(node)
          if (node.type === 'ExportNamedDeclaration' && node.specifiers.length > 0) {
            addScope(node)
          }
          currentScope.addVariable(node, { ...NULL_ADD_VARIABLE_CONTEXT, declaration: node })
          break
        }
        case 'FunctionDeclaration':
        case 'FunctionExpression':
        case 'ArrowFunctionExpression': {
          currentScope.addVariable(node, {
            definition: { node, kind: 'function' },
            declaration: node
          })
          addScope(node)
          for (const param of node.params) {
            for (const extract of extractNames(param)) {
              currentScope.addVariable(extract.node, {
                definition: { node, kind: 'function' },
                name: extract.name,
                declaration: node
              })
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
          currentScope.addVariable(node, { definition: { node, kind: 'class' }, declaration: node })
          break
        }
        case 'VariableDeclaration': {
          currentScope.addVariable(node, {
            definition: { node, kind: node.kind as DefinitionKind },
            declaration: node
          })
          break
        }
        case 'CatchClause': {
          addScope(node)
          if (node.param) {
            for (const extract of extractNames(node.param as Node)) {
              if (extract.node) {
                currentScope.addVariable(extract.node, {
                  definition: { node, kind: 'catch' },
                  name: extract.name,
                  declaration: node
                })
              }
            }
          }
          break
        }
        case 'LabeledStatement': {
          addLabel(currentScope, node)
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

  /**
   * anaylze references
   */

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

  /**
   * analyze exports
   */

  function setExportDeclaration(
    scope: Scope,
    node: ExportDefaultDeclaration | ExportNamedDeclaration,
    name: string
  ): void {
    const variable = scope.getVariable(name)
    if (variable) {
      variable.export = node
    }
  }

  for (let i = exportDeclarations.length - 1; i >= 0; --i) {
    const exportDeclaration = exportDeclarations[i]
    switch (exportDeclaration.type) {
      case 'ExportDefaultDeclaration': {
        if (exportDeclaration.declaration.type === 'Identifier') {
          setExportDeclaration(scope, exportDeclaration, exportDeclaration.declaration.name)
        }
        break
      }
      case 'ExportNamedDeclaration': {
        if (
          exportDeclaration.declaration &&
          exportDeclaration.declaration.type === 'VariableDeclaration'
        ) {
          for (const declarator of exportDeclaration.declaration.declarations) {
            for (const extract of extractNames(declarator.id)) {
              setExportDeclaration(scope, exportDeclaration, extract.name)
            }
          }
        } else if (exportDeclaration.specifiers.length > 0) {
          for (const specifier of exportDeclaration.specifiers) {
            if (
              specifier.type === 'ExportSpecifier' &&
              specifier.exported.type === 'Identifier' &&
              specifier.local.type === 'Identifier'
            ) {
              setExportDeclaration(scope, exportDeclaration, specifier.local.name)
            }
          }
        }
        break
      }
    }
  }

  /**
   * analyze first node after import declaration
   */

  let firstNodeAfterImportDeclaration: Node | undefined
  if (ast.type === 'Program' && ast.body.length > 0) {
    for (const node of ast.body) {
      firstNodeAfterImportDeclaration = node
      if (node.type !== 'ImportDeclaration') {
        break
      }
    }
  }

  return {
    map,
    globals,
    scope,
    firstNodeAfterImportDeclaration
  }
}

export function getReferences(variable: Variable, exclude = true): Identifier[] {
  const references = [...variable.references]
  return exclude ? references.filter(ref => ref !== variable.identifier) : references
}

export type ExportVariables = {
  readable: Variable[]
  writable: Variable[]
}

export function getExportVariables(
  scope: Scope,
  cb?: (variable: Variable) => void
): ExportVariables {
  const readable: Variable[] = []
  const writable: Variable[] = []
  for (const variable of scope.variables.values()) {
    if (variable.export == undefined) {
      continue
    } else {
      cb?.(variable)
      if (variable.definition.kind === 'let') {
        writable.push(variable)
      } else if (variable.definition.kind === 'const') {
        readable.push(variable)
      }
    }
  }
  return { readable, writable }
}
