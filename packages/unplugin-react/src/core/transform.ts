// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)

import createDebug from 'debug'
import { walkAST } from 'ast-kit'
import { parse as parseBabel } from '@babel/parser'
import MagicStringStack from 'magic-string-stack'
import { compile } from 'jsx-vapor-compiler'
// import { isObject, isString } from '@vue-vapor/shared'
// import { EXPORT_HELPER_ID } from './helper'
// import { createRollupError } from './utils'

// import type { UnpluginOptions } from 'unplugin'
import type { ParserPlugin } from '@babel/parser'
import type { BabelNode, JSXElement, JSXFragment } from 'jsx-vapor-compiler'
import type { ResolvedOptions } from './types'
// import type { RawSourceMap } from 'source-map-js'

const debug = createDebug('unplugin-react-vapor:core:transform')

const RE_TS = /\.tsx$/

export function transform(
  code: string,
  filepath: string,
  _options: ResolvedOptions
): ReturnType<typeof generateTransform> {
  // const { root, isProduction } = options
  debug('transforming ...', code)
  const s = new MagicStringStack(code)

  const plugins: ParserPlugin[] = ['jsx']
  const isTS = RE_TS.test(filepath)
  if (isTS) {
    plugins.push('typescript')
  }

  const babelAst = parseBabel(s.original, {
    sourceType: 'module',
    plugins
  })

  let preambleIndex = 0
  const importSet = new Set<string>()
  const delegateEventSet = new Set<string>()
  const preambleMap = new Map<string, string>()
  function _transform() {
    const rootNodes: (JSXElement | JSXFragment)[] = []
    walkAST<BabelNode>(babelAst, {
      enter(node, parent) {
        console.log('enter', node.type, parent?.type)
        switch (node.type) {
          case 'ImportDeclaration': {
            s.overwrite(node.source.start!, node.source.end!, `"react-vapor-hooks"`)
            break
          }
          case 'JSXElement': {
            if (parent?.type === 'ReturnStatement') {
              console.log('JSXElement', s.slice(node.start!, node.end!))
              rootNodes.push(node)
              this.skip()
            }
          }
        }
      }
    })

    for (const node of rootNodes) {
      // eslint-disable-next-line prefer-const
      let { code, vaporHelpers, preamble } = compile(s.slice(node.start!, node.end!), {
        mode: 'module',
        inline: true,
        isTS,
        filename: filepath
      })
      vaporHelpers.forEach(helper => importSet.add(helper))

      preamble = preamble.replaceAll(/(?<=const )t(?=(\d))/g, `_${preambleIndex}`)
      code = code.replaceAll(/(?<== )t(?=\d)/g, `_${preambleIndex}`)
      preambleIndex++

      for (const [, key, value] of preamble.matchAll(/const (_\d+) = (_template\(.*\))/g)) {
        const result = preambleMap.get(value)
        if (result) {
          code = code.replaceAll(key, result)
        } else {
          preambleMap.set(value, key)
        }
      }

      for (const [, events] of preamble.matchAll(/_delegateEvents\((.*)\)/g)) {
        events.split(', ').forEach(event => delegateEventSet.add(event))
      }

      s.overwrite(node.start!, node.end!, code)
    }
  }
  _transform()

  if (delegateEventSet.size > 0) {
    s.prepend(`_delegateEvents(${[...delegateEventSet].join(', ')});\n`)
  }

  if (preambleMap.size > 0) {
    let preambleResult = ''
    for (const [value, key] of preambleMap) {
      preambleResult += `const ${key} = ${value}\n`
    }
    s.prepend(preambleResult)
  }

  const importResult = [...importSet].map(i => `${i} as _${i}`)
  if (importResult.length > 0) {
    s.prepend(`import { ${importResult.join(', ')} } from "vue/vapor"\n`)
  }

  return generateTransform(s, filepath)
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

// function isJSXElement(
//   node?: BabelNode | null,
// ): node is JSXElement | JSXFragment {
//   return !!node && (node.type === 'JSXElement' || node.type === 'JSXFragment')
// }
