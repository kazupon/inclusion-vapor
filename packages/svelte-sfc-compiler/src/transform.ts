// SPDX-License-Identifier: MIT
// Author: kazuya kawaguchi (a.k.a. kazupon)

// import generate from '@babel/generator'
// import { print as _generate } from 'code-red'
import { walkAST, walkImportDeclaration } from 'ast-kit'
import { analyze as analyzeAst, getExportVariables, getReferences } from 'inclusion-vapor-shared'
import { generateTransform, MagicStringAST } from 'magic-string-ast'
import { parseSvelteScript } from './parse.ts'

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
   * Svelte script context code
   */
  moduleCode?: string
  /**
   * Svelte script context AST, which is parsed by `parseSvelteScript`
   */
  moduleAst?: ReturnType<typeof parseSvelteScript>
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
  const babelFileNode = options.ast ? options.ast.content : parseSvelteScript(code)
  const ast = babelFileNode.program
  const s = new MagicStringAST(code, { offset: -babelFileNode.start! })

  // if (options.moduleAst) {
  //   console.log('offset', babelFileNode.start!, options.moduleAst.start)
  // }

  const analyzed = analyze(ast, options)
  const sModule =
    analyzed.analyzedScriptModule && options.moduleAst
      ? new MagicStringAST(options.moduleCode!, { offset: -options.moduleAst.start! })
      : undefined
  transform({
    ...analyzed,
    code,
    ast,
    s,
    moduleAst: options.moduleAst?.program,
    moduleCode: options.moduleCode,
    sModule
  })

  return generate(s, options)
}

function analyze(ast: BabelProgram, options: TransformSvelteScriptOptions = {}) {
  // analyze svelte script instance
  const { scope, firstNodeAfterImportDeclaration } = analyzeAst(ast)

  // analyze svelte script context module
  let modAnalyzed: ReturnType<typeof analyzeAst> | undefined
  if (options.moduleAst) {
    modAnalyzed = analyzeAst(options.moduleAst.program)
  }

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
   * collect script module variables
   */
  const refModuleVariables = modAnalyzed
    ? [...modAnalyzed.scope.variables.values()].filter(variable => {
        return (
          variable.definition.node.type === 'VariableDeclarator' &&
          variable.declaration.type === 'VariableDeclaration' &&
          variable.declaration.kind === 'let'
        )
      })
    : []

  if (refModuleVariables.length > 0) {
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

  /**
   * collect effectable references and label statements
   */

  // keep effectable references to use as `computed()`
  const effectables = new Set<string>()
  // keep label statements to replace with `computed`, `watchEffect` and etc
  const transformableEffectLabels = new Set<[BabelLabeledStatement, BabelIdentifier | undefined]>()

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

    if (effectables.has(name)) {
      return true
    }

    return false
  }

  function collectRecursiveEffectables(node: BabelNode): BabelIdentifier | undefined {
    switch (node.type) {
      case 'Identifier': {
        if (!hasReactivityVariable(node.name)) {
          effectables.add(node.name)
          vaporImports.add('computed')
          return node
        }
        break
      }
      // TODO: spread pattern
      // case 'ObjectPattern': {
      //   for (const property of node.properties) {
      //     if (property.type === 'ObjectProperty') {
      //       collectRecursiveEffectables(property.value)
      //     }
      //   }
      //   break
      // }
      // case 'ArrayPattern': {
      //   for (const element of node.elements) {
      //     if (element) {
      //       collectRecursiveEffectables(element)
      //     }
      //   }
      //   break
      // }
      default: {
        return undefined
      }
    }
  }

  for (const labelStmt of scope.labels.filter(node => node.label.name === '$')) {
    if (labelStmt.body.type === 'BlockStatement') {
      // `$: { ... }`
      // TODO: strictly collect block statement
      transformableEffectLabels.add([labelStmt, undefined])
      vaporImports.add('watchEffect')
    } else if (labelStmt.body.type === 'ExpressionStatement') {
      // `$: x = 1`, `$: setCount(count + 1)` and etc
      const expression = labelStmt.body.expression
      switch (expression.type) {
        case 'CallExpression': {
          for (const arg of expression.arguments) {
            if (arg.type === 'Identifier' && hasReactivityVariable(arg.name)) {
              transformableEffectLabels.add([labelStmt, undefined])
              vaporImports.add('watchEffect')
              break
            }
          }
          break
        }
        case 'AssignmentExpression': {
          if (expression.operator === '=') {
            const id = collectRecursiveEffectables(expression.left)
            walkAST(expression.right, {
              enter(node) {
                if (node.type === 'Identifier' && hasReactivityVariable(node.name)) {
                  transformableEffectLabels.add([labelStmt, id])
                  this.remove()
                }
              }
            })
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
  const storeReferences = getVaporStoreConvertibleVariables(scope, storeVariables)

  return {
    scope,
    firstNodeAfterImportDeclaration,
    vaporImports,
    refVariables,
    refModuleVariables,
    removableExportDeclarations,
    exportVariables,
    effectables,
    transformableEffectLabels,
    storeImports,
    storeVariables,
    storeReferences,
    analyzedScriptModule: modAnalyzed
  }
}

type TransformContext = ReturnType<typeof analyze> & {
  code: string
  ast: BabelProgram
  s: MagicStringAST
  moduleCode?: string
  moduleAst?: BabelProgram
  sModule?: MagicStringAST
}

function transform(context: TransformContext): void {
  transformReactivity(context)
  transformProps(context)
  transformStore(context)
  transformEffect(context)
  const exports = prependCodes(context)
  appendCodes(context, exports)
}

function transformReactivity({
  s,
  refVariables,
  scope,
  code,
  sModule,
  refModuleVariables,
  moduleCode
}: TransformContext): void {
  /**
   * transform `let` define variables and reference variables
   */
  for (const variable of refVariables) {
    // transform to `ref()`
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

    // transform to `.value`
    const refs = getReferences(variable)
    for (const ref of refs) {
      s.overwriteNode(ref, `${ref.name}.value`)
    }
  }

  /**
   * transform `let` define variables and reference variables in script module
   */
  if (sModule && moduleCode) {
    // transform instance with script module variables
    const transformInstance = (sc: Scope, v: Variable) => {
      for (const r of sc.references) {
        if (r.name === v.name) {
          s.overwriteNode(r, `${v.name}.value`)
        }
      }
      for (const child of sc.children) {
        transformInstance(child, v)
      }
    }

    for (const variable of refModuleVariables) {
      // transform to `ref()`
      if (
        variable.definition.node.type === 'VariableDeclarator' &&
        variable.definition.node.init != undefined &&
        validateNodeTypeForVaporRef(variable.definition.node.init)
      ) {
        const target = variable.export || variable.declaration
        sModule.overwriteNode(
          target,
          `const ${variable.name} = ref(${sliceCode(moduleCode, variable.definition.node.init, sModule.offset)})`
        )
      } else {
        continue
      }

      // transform to `.value`
      const refs = getReferences(variable)
      for (const ref of refs) {
        sModule.overwriteNode(ref, `${ref.name}.value`)
      }
      transformInstance(scope, variable)
    }
  }
}

function sliceCode(code: string, node: BabelNode, offset?: number): string {
  return offset == undefined
    ? code.slice(node.start!, node.end!)
    : code.slice(node.start! + offset, node.end! + offset)
}

function transformEffect(context: TransformContext): void {
  const { s, transformableEffectLabels } = context
  /**
   * transform effect label statements
   */
  for (const [labelStmt, id] of transformableEffectLabels) {
    if (labelStmt.body.type === 'BlockStatement') {
      // `$: { ... }`
      s.overwriteNode(labelStmt, `watchEffect(() => ${s.sliceNode(labelStmt.body)})\n`)
    } else if (labelStmt.body.type === 'ExpressionStatement') {
      // `$: x = y`, `$: setCount(count + 1)` and etc
      const expression = labelStmt.body.expression
      switch (expression.type) {
        case 'CallExpression': {
          s.overwriteNode(labelStmt, `watchEffect(() => ${s.sliceNode(labelStmt.body)})\n`)
          break
        }
        case 'AssignmentExpression': {
          if (expression.operator === '=' && id) {
            s.overwriteNode(
              labelStmt,
              `const ${id.name} = computed(() => ${s.sliceNode(expression.right)})\n`
            )
            replaceLabelEffectableReferences(context.scope, id, context)
          }
          break
        }
        // No default
      }
    }
  }
}

function replaceLabelEffectableReferences(
  scope: Scope,
  id: BabelIdentifier,
  context: TransformContext
): void {
  const refs = scope.references.filter(ref => ref.start! > id.start! && ref.name === id.name)
  refs.forEach(ref => context.s.overwriteNode(ref, `${context.s.sliceNode(ref)}.value`))
  scope.children.forEach(child => replaceLabelEffectableReferences(child, id, context))
}

function transformProps(context: TransformContext): void {
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

function transformStore(context: TransformContext): void {
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

function prependCodes({
  s,
  vaporImports: imports,
  sModule,
  moduleCode,
  moduleAst
}: TransformContext): string[] {
  const codes: string[] = []
  const exports: string[] = []

  // prepend imports
  if (imports.size > 0) {
    codes.push(`import { ${[...imports].join(', ')} } from 'vue/vapor'\n`)
  }

  // prepend script context module
  if (moduleCode && moduleAst) {
    // const contextStr = new MagicStringAST(moduleCode)
    for (const node of moduleAst.body) {
      if (node.type === 'ExportNamedDeclaration') {
        if (node.specifiers.length > 0) {
          // TODO:
        } else {
          if (node.declaration!.type === 'VariableDeclaration') {
            for (const declaration of node.declaration.declarations) {
              if (declaration.id.type === 'Identifier') {
                exports.push(declaration.id.name)
              }
            }
          } else if (node.declaration!.type === 'FunctionDeclaration') {
            if (sModule) {
              sModule.overwriteNode(node, sModule.sliceNode(node.declaration))
            }
            exports.push(node.declaration.id!.name)
          }
        }
      } else if (node.type === 'ExportDefaultDeclaration') {
        // TODO:
      } else {
        // TODO:
        // codes.push(sliceCode(moduleCode, node))
      }
    }

    if (sModule && sModule.hasChanged()) {
      codes.push(sModule.toString())
    }

    codes.push(`\n`)
  }

  if (codes.length > 0) {
    s.prepend(codes.join('\n'))
  }

  return exports
}

function appendCodes({ s }: TransformContext, exports: string[]): void {
  if (exports.length > 0) {
    s.append(`\ndefineExpose({ ${exports.join(', ')} })`)
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

function getVaporStoreConvertibleVariables(scope: Scope, variables: Variable[]): BabelIdentifier[] {
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
