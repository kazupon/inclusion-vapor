// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)

import createDebug from 'debug'
import { parse as parseBabel } from '@babel/parser'
import MagicStringStack from 'magic-string-stack'
import { walkAST } from 'ast-kit'
import { compile } from 'jsx-vapor-compiler'

import type { ParserPlugin } from '@babel/parser'
import type { Node as BabelNode, ReturnStatement, FunctionDeclaration } from '@babel/types'
import type { ResolvedOptions } from './types'
import type { VaporCodegenResult, CompilerOptions } from 'jsx-vapor-compiler'

const debug = createDebug('unplugin-react-vapor:core:transform')

const RE_TS = /\.tsx$/

type VaporTransformContext = {
  s: MagicStringStack
  preambleIndex: number
  importSet: Set<string>
  delegateEventSet: Set<string>
  preambleMap: Map<string, string>
  compilerOptions: CompilerOptions
}

export function transformComponent(
  code: string,
  filepath: string,
  _options: ResolvedOptions
): ReturnType<typeof generateTransform> {
  // const { root, isProduction } = options
  debug('transformComponent ...', code)

  const plugins: ParserPlugin[] = ['jsx']
  const isTS = RE_TS.test(filepath)
  if (isTS) {
    plugins.push('typescript')
  }

  const ctx: VaporTransformContext = {
    s: new MagicStringStack(code),
    preambleIndex: 0,
    preambleMap: new Map<string, string>(),
    importSet: new Set<string>(),
    delegateEventSet: new Set<string>(),
    compilerOptions: {
      mode: 'module',
      inline: true,
      filename: filepath,
      isTS
    }
  }

  const babelAst = parseBabel(ctx.s.original, {
    sourceType: 'module',
    plugins
  })

  for (const node of babelAst.program.body) {
    switch (node.type) {
      case 'ImportDeclaration': {
        if (node.type === 'ImportDeclaration') {
          ctx.s.overwrite(node.source.start!, node.source.end!, `"react-vapor-hooks"`)
        }
        break
      }
      case 'FunctionDeclaration': {
        transformComponentFunctionDeclaration(ctx, node)
        break
      }
      case 'VariableDeclaration': {
        // TODO:
        break
      }
      case 'ExportNamedDeclaration': {
        // TODO:
        break
      }
      case 'ExportDefaultDeclaration': {
        if (node.declaration.type === 'FunctionDeclaration') {
          transformComponentFunctionDeclaration(ctx, node.declaration, true)
        } else {
          // TODO:
        }
        break
      }
    }
  }

  // tweak preamble
  generatePreamble(ctx)

  // code generation!
  return generateTransform(ctx.s, filepath)
}

function transformComponentFunctionDeclaration(
  ctx: VaporTransformContext,
  node: FunctionDeclaration,
  exportDefault: boolean = false
) {
  const returnStmt = node.body.body.find(
    node => node.type === 'ReturnStatement' && isJSXNode(node.argument)
  ) as ReturnStatement | undefined
  if (returnStmt && returnStmt.argument) {
    // TODO: optimaize jsx compiler for AST
    const result = compile(
      ctx.s.slice(returnStmt.argument.start!, returnStmt.argument.end!),
      ctx.compilerOptions
    )
    aggregateAndTransfomrPreamble(ctx, returnStmt, result, code => `return ${code}`)
    const funcName = node.id?.name ?? `Anonymous${ctx.preambleIndex}`
    const componentCode = `${exportDefault ? '' : 'const '}${funcName} = /*#__PURE__*/ _defineComponent(() => ${ctx.s.slice(node.body.start!, node.body.end!)})\n`
    ctx.importSet.add(`defineComponent`)
    ctx.s.overwrite(node.start!, node.end!, componentCode)
  }
}

export function transformReactivity(
  code: string,
  filepath: string,
  _options: ResolvedOptions
): ReturnType<typeof generateTransform> {
  debug('transformReactivity ...', code)

  const plugins: ParserPlugin[] = ['jsx']
  const isTS = RE_TS.test(filepath)
  if (isTS) {
    plugins.push('typescript')
  }

  const s = new MagicStringStack(code)
  const babelAst = parseBabel(s.original, {
    sourceType: 'module',
    plugins
  })

  const variables: Set<string> = new Set()
  walkAST<BabelNode>(babelAst, {
    enter(node, parent) {
      if (node.type === 'Identifier') {
        if (parent?.type === 'CallExpression') {
          // console.log('enter', node.type, node.name, parent?.type)
          if (
            node.name === '_defineComponent' &&
            parent?.arguments.length === 1 &&
            parent?.arguments[0].type === 'ArrowFunctionExpression'
          ) {
            const funcNode = parent?.arguments[0]
            if (funcNode.body.type === 'BlockStatement') {
              for (const child of funcNode.body.body) {
                if (child.type === 'VariableDeclaration') {
                  for (const decl of child.declarations) {
                    if (
                      decl.type === 'VariableDeclarator' &&
                      decl.init?.type === 'CallExpression' &&
                      decl.init.callee.type === 'Identifier' &&
                      decl.init.callee.name === 'useState' &&
                      decl.id.type === 'ArrayPattern' &&
                      decl.id.elements[0] &&
                      decl.id.elements[0].type === 'Identifier'
                    ) {
                      variables.add(decl.id.elements[0].name)
                    }
                  }
                }
              }
            }
          } else {
            if (variables.has(node.name)) {
              s.overwrite(node.start!, node.end!, `${node.name}.value`)
            }
          }
        } else {
          if (variables.has(node.name) && parent?.type !== 'ArrayPattern') {
            s.overwrite(node.start!, node.end!, `${node.name}.value`)
          }
        }
      }
      // leave(node, parent) {
      //   if (node.type === 'Identifier' && parent?.type === 'CallExpression') {
      //     console.log('leave', node.type, node.name, parent?.type)
      //   }
      // }
    }
  })

  return generateTransform(s, filepath)
}

function aggregateAndTransfomrPreamble(
  ctx: VaporTransformContext,
  node: BabelNode,
  result: VaporCodegenResult,
  contentGen?: (code: string) => string
) {
  const codeGen = contentGen || (code => code)

  result.vaporHelpers.forEach(helper => ctx.importSet.add(helper))

  const preamble = result.preamble.replaceAll(/(?<=const )t(?=(\d))/g, `_${ctx.preambleIndex}`)
  let code = result.code.replaceAll(/(?<== )t(?=\d)/g, `_${ctx.preambleIndex}`)
  ctx.preambleIndex++

  for (const [, key, value] of preamble.matchAll(/const (_\d+) = (_template\(.*\))/g)) {
    const result = ctx.preambleMap.get(value)
    if (result) {
      code = code.replaceAll(key, result)
    } else {
      ctx.preambleMap.set(value, key)
    }
  }

  for (const [, events] of preamble.matchAll(/_delegateEvents\((.*)\)/g)) {
    events.split(', ').forEach(event => ctx.delegateEventSet.add(event))
  }

  ctx.s.overwrite(node.start!, node.end!, codeGen(code))
}

function generatePreamble(ctx: VaporTransformContext) {
  if (ctx.delegateEventSet.size > 0) {
    ctx.s.prepend(`_delegateEvents(${[...ctx.delegateEventSet].join(', ')});\n`)
  }

  if (ctx.preambleMap.size > 0) {
    let preambleResult = ''
    for (const [value, key] of ctx.preambleMap) {
      preambleResult += `const ${key} = ${value}\n`
    }
    ctx.s.prepend(preambleResult)
  }

  const imports = [...ctx.importSet].map(i => `${i} as _${i}`)
  if (imports.length > 0) {
    ctx.s.prepend(`import { ${imports.join(', ')} } from "vue/vapor"\n`)
  }
}

type SourceMap = ReturnType<typeof MagicStringStack.prototype.generateMap>

function generateTransform(
  s: MagicStringStack,
  id: string
): { code: string; map: SourceMap } | undefined {
  if (s.hasChanged()) {
    return {
      code: s.toString(),
      map: s.generateMap({
        source: id,
        includeContent: true,
        hires: 'boundary'
      })
    }
  }
}

function isJSXNode(node: BabelNode | null | undefined): boolean {
  return !!node && (node.type === 'JSXElement' || node.type === 'JSXFragment')
}
