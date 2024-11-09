// SPDX-License-Identifier: MIT
// Author: kazuya kawaguchi (a.k.a. kazupon)

// import generate from '@babel/generator'
// import { print as _generate } from 'code-red'
import { parse as parseBabel } from '@babel/parser'
import { walkImportDeclaration } from 'ast-kit'
import { analyze as analyzeAst, getExportVariables, getReferences } from 'inclusion-vapor-shared'
import { generateTransform, MagicStringAST } from 'magic-string-ast'

import type {
  Identifier as BabelIdentifier,
  ImportDeclaration as BabelImportDeclaration,
  LabeledStatement as BabelLabeledStatement,
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
  const ast = babelFileNode.program
  const s = new MagicStringAST(code, { offset: -babelFileNode.start! })

  const analyzed = analyze(ast)
  rewrite({ ...analyzed, code, ast, s })

  return generate(s, options)
}

function analyze(ast: BabelProgram) {
  const { scope, firstNodeAfterImportDeclaration } = analyzeAst(ast)

  // keep vapor imports (`import { ... } from 'vue/vapor'`) to generate
  const vaporImports = new Set<string>()

  /**
   * collect variables that are declared with `let` to be used as `ref()`
   */

  const refVariables = [...scope.variables.values()].filter(variable => {
    return (
      variable.definition.node.type === 'VariableDeclarator' &&
      variable.declaration.type === 'VariableDeclaration' &&
      variable.declaration.kind === 'let' &&
      variable.export == undefined
    )
  })

  if (refVariables.length > 0) {
    vaporImports.add('ref')
  }

  /**
   * collect export variables (`export let ...`) to be used as props
   */

  const removableExportDeclarations = new Set<BabelNode>()
  const exportVariables = getExportVariables(scope, variable => {
    removableExportDeclarations.add(variable.export)
    removableExportDeclarations.add(variable.declaration)
  })

  function hasReactivityVariable(name: string): boolean {
    for (const variable of refVariables) {
      if (variable.name === name) {
        return true
      }
    }
    for (const variable of [...exportVariables.readable, ...exportVariables.writable]) {
      if (variable.name === name) {
        return true
      }
    }
    return false
  }

  /**
   * collect effectable references and label statements
   */

  // keep effectable references to use as `computed()`
  const effectables = new Set<string>()
  // keep label statements to replace with `computed`, `watchEffect` and etc
  const transformableEffectLabels = new Set<BabelLabeledStatement>()

  function collectRecusiveEffectables(node: BabelNode) {
    switch (node.type) {
      case 'Identifier': {
        if (!hasReactivityVariable(node.name)) {
          effectables.add(node.name)
          vaporImports.add('computed')
        }
        break
      }
      case 'ObjectPattern': {
        for (const property of node.properties) {
          if (property.type === 'ObjectProperty') {
            collectRecusiveEffectables(property.value)
          }
        }
        break
      }
      case 'ArrayPattern': {
        for (const element of node.elements) {
          if (element) {
            collectRecusiveEffectables(element)
          }
        }
        break
      }
      // No default
    }
  }

  for (const labelStmt of scope.labels.filter(node => node.label.name === '$')) {
    if (labelStmt.body.type === 'BlockStatement') {
      // `$: { ... }`
      // TODO: strictly collect block statement
      transformableEffectLabels.add(labelStmt)
      vaporImports.add('watchEffect')
    } else if (labelStmt.body.type === 'ExpressionStatement') {
      // `$: x = 1`, `$: setCount(count + 1)` and etc
      const expression = labelStmt.body.expression
      switch (expression.type) {
        case 'CallExpression': {
          for (const arg of expression.arguments) {
            if (arg.type === 'Identifier' && hasReactivityVariable(arg.name)) {
              transformableEffectLabels.add(labelStmt)
              vaporImports.add('watchEffect')
            }
          }
          break
        }
        case 'AssignmentExpression': {
          if (expression.operator === '=') {
            collectRecusiveEffectables(expression.left)
            if (expression.right.type === 'Identifier') {
              if (hasReactivityVariable(expression.right.name)) {
                transformableEffectLabels.add(labelStmt)
              }
            } else if (expression.right.type === 'CallExpression') {
              for (const arg of expression.right.arguments) {
                if (arg.type === 'Identifier' && hasReactivityVariable(arg.name)) {
                  transformableEffectLabels.add(labelStmt)
                }
              }
            }
          }
          break
        }
        // No default
      }
    }
  }

  /**
   * collect store imports
   */

  const storeImportBindings = new Map<string, ImportBinding>()
  const storeImports = new Map<BabelImportDeclaration, string>()
  for (const node of ast.body) {
    switch (node.type) {
      case 'ImportDeclaration': {
        if (node.source.value === 'svelte') {
          storeImports.set(node, 'svelte')
        } else if (node.source.value === 'svelte/store') {
          storeImports.set(node, 'svelte/store')
          const imports: Record<string, ImportBinding> = {}
          walkImportDeclaration(imports, node)
          for (const [name, binding] of Object.entries(imports)) {
            if (!storeImportBindings.has(name)) {
              storeImportBindings.set(name, binding)
            }
          }
        } else {
          // TODO: svelte/animate, svelte/transition and etc
        }
        break
      }
    }
  }
  const storeVariables = getVaporStoreVariables(scope, Object.fromEntries(storeImportBindings))
  const storeReferences = getVaporStoreConvertableVariables(scope, storeVariables)

  return {
    scope,
    firstNodeAfterImportDeclaration,
    vaporImports,
    refVariables,
    removableExportDeclarations,
    exportVariables,
    effectables,
    transformableEffectLabels,
    storeImports,
    storeVariables,
    storeReferences
  }
}

type RewriteContext = ReturnType<typeof analyze> & {
  code: string
  ast: BabelProgram
  s: MagicStringAST
}

function rewrite(context: RewriteContext): void {
  rewriteRef(context)
  rewriteProps(context)
  rewriteStore(context)
  rewriteEffect(context)
  prependVaporImports(context)
}

function rewriteRef(context: RewriteContext): void {
  const { s, refVariables, code } = context

  /**
   * rewrite define variables and reference variables
   */
  for (const variable of refVariables) {
    // rewrite to `ref()`
    if (
      variable.export == undefined &&
      variable.definition.node.type === 'VariableDeclarator' &&
      variable.definition.node.init != undefined &&
      validateNodeTypeForVaporRef(variable.definition.node.init)
    ) {
      s.overwriteNode(
        variable.declaration,
        `const ${variable.name} = ref(${sliceCode(code, variable.definition.node.init, s.offset)})`
      )
    } else {
      continue
    }

    // rewrite to `.value`
    const refs = getReferences(variable)
    for (const ref of refs) {
      s.overwriteNode(ref, `${ref.name}.value`)
    }
  }
}

function sliceCode(code: string, node: BabelNode, offset?: number): string {
  return offset == undefined
    ? code.slice(node.start!, node.end!)
    : code.slice(node.start! + offset, node.end! + offset)
}

function rewriteEffect(context: RewriteContext): void {
  const { s, transformableEffectLabels } = context
  /**
   * rewrite effect label statements
   */
  for (const labelStmt of transformableEffectLabels) {
    if (labelStmt.body.type === 'BlockStatement') {
      // `$: { ... }`
      s.overwriteNode(labelStmt, `watchEffect(() => ${s.sliceNode(labelStmt.body)})\n`)
    } else if (labelStmt.body.type === 'ExpressionStatement') {
      // `$: x = 1`, `$: setCount(count + 1)` and etc
      switch (labelStmt.body.expression.type) {
        case 'CallExpression': {
          break
        }
        case 'AssignmentExpression': {
          break
        }
        // No default
      }
    }
  }
}

function rewriteProps(context: RewriteContext): void {
  const {
    s,
    code,
    removableExportDeclarations,
    exportVariables: { readable: exportReadableVariables, writable: exportWritableVariables },
    firstNodeAfterImportDeclaration
  } = context

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
        defaultValue = sliceCode(code, variable.definition.node.init)
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
        ? [...acc, `${variable.name} = ${sliceCode(code, variable.definition.node.init)}`]
        : [...acc, variable.name]
    }, [] as string[])
    codes.push(
      `const { ${exportReadableProps.join(
        ', '
      )} } = defineProps([${exportReadableVariables.map(variable => `'${variable.name}'`).join(', ')}])`
    )
  }

  /**
   * remove unnecessary variables
   */
  removableExportDeclarations.forEach(declaration => s.removeNode(declaration))

  /**
   * insert code to the first node after import declaration
   */
  if (firstNodeAfterImportDeclaration) {
    s.prependRight(firstNodeAfterImportDeclaration.start! + s.offset, codes.join('\n'))
  }
}

function rewriteStore(context: RewriteContext): void {
  const { s, storeImports, storeVariables, storeReferences } = context

  for (const [node, source] of storeImports) {
    if (source === 'svelte') {
      s.overwriteNode(node.source, `'svelte-vapor-runtime'`)
    } else if (source === 'svelte/store') {
      const additionalSpecifiers: string[] = []
      for (const specifier of node.specifiers) {
        if (specifier.local.name === 'writable') {
          additionalSpecifiers.push('writable', 'useWritableStore')
        } else if (specifier.local.name === 'readable') {
          additionalSpecifiers.push('readable', 'useWritableStore')
        }
      }
      insertStoreComposable(s, storeVariables)
      replaceStoreIdentifier(s, storeReferences)
      s.overwriteNode(
        node,
        `import { ${[...additionalSpecifiers].join(', ')} } from 'svelte-vapor-runtime/store'`
      )
    }
  }
}

function prependVaporImports(context: RewriteContext): void {
  const { s, vaporImports: imports } = context
  if (imports.size > 0) {
    s.prepend(`import { ${[...imports].join(', ')} } from 'vue/vapor'\n`)
  }
}

function validateNodeTypeForVaporRef(node: BabelNode): boolean {
  // TODO: more validation, binary expression, call expression and etc ...
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
      s.appendRight(def.end! + s.offset, makeComposable(variable, def.init.callee))
    }
  }
}

function replaceStoreIdentifier(s: MagicStringAST, references: BabelIdentifier[]): void {
  for (const ref of references) {
    s.overwriteNode(ref, `${s.sliceNode(ref)}.value`)
  }
}

function generate(
  s: MagicStringAST,
  options: TransformSvelteScriptOptions = {}
): string | { code: string; map: GenerateMap } {
  const sourceMap = !!options.sourcemap
  const id = options.id

  if (sourceMap) {
    if (!id) {
      throw new Error('`id` is required when `sourcemap` is enabled')
    }
    const gen = generateTransform(s, id)
    if (gen == undefined) {
      throw new Error('Failed to generate source map')
    }
    return gen
  } else {
    return s.toString()
  }
}
