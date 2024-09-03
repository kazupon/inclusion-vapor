// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-sfc`
// Author: Evan you (https://github.com/yyx990803)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-sfc/src/parse.ts

import { isSvelteAttribute, isSvelteText } from 'svelte-vapor-template-compiler'
import { compile as compileSvelte, parse as parseSvelte } from 'svelte/compiler'
// import { SourceMapGenerator } from 'source-map-js'

import type {
  CompilerError
  // RawSourceMap,
  // CodegenSourceMapGenerator
} from '@vue-vapor/compiler-dom'
import type { SFCBlock } from '@vue-vapor/compiler-sfc'
import type { SvelteScript, SvelteStyle, SvelteTemplateNode } from 'svelte-vapor-template-compiler'
import type {
  SvelteParseOptions,
  SvelteSFCDescriptor,
  SvelteSFCParseResult,
  SvelteSFCScriptBlock,
  SvelteSFCStyleBlock,
  SvelteSFCTemplateBlock
} from './types.ts'

export const DEFAULT_FILENAME = 'anonymous.svelte'

/**
 * Parse a svelte source file into an SFC descriptor.
 *
 * @param {string} source - a string of svelte source code
 * @param {SvelteCompileOptions} options - a {@link SvelteParseOptions}
 * @returns {SvelteSFCParseResult} {@link SvelteSFCParseResult}
 */
export function parse(source: string, options: SvelteParseOptions = {}): SvelteSFCParseResult {
  // TODO:
  // const cache = parseCache.get(sourceKey)
  // if (cache) {
  //   return cache
  // }

  const {
    // sourceMap = true,
    filename = DEFAULT_FILENAME,
    // sourceRoot = '',
    pad = false,
    // ignoreEmpty = true,
    compiler = { compile: compileSvelte, parse: parseSvelte },
    templateParseOptions = {}
    // parseExpressions = true,
  } = options

  const descriptor: SvelteSFCDescriptor = {
    filename,
    source,
    template: null, // eslint-disable-line unicorn/no-null
    script: null, // eslint-disable-line unicorn/no-null
    scriptSetup: null, // eslint-disable-line unicorn/no-null
    styles: [],
    customBlocks: [],
    cssVars: [],
    slotted: false,
    vapor: true,
    // TODO:
    shouldForceReload: _prevImports => false
    // shouldForceReload: prevImports => hmrShouldReload(prevImports, descriptor),
  }

  const errors: (CompilerError | SyntaxError)[] = []
  const ast = compiler.parse(source, {
    ...templateParseOptions
  })

  // template
  descriptor.template = createSvelteTemplateBlock(ast.html, source, false)

  // script
  if (ast.instance) {
    // NOTE: put in to be processed by `compileScript` in `@vue/compiler-sfc`.
    descriptor.scriptSetup = createSvelteScriptBlock(ast.instance, source, pad)
  }

  // module
  // TODO:

  // style
  if (ast.css) {
    descriptor.styles.push(createSvelteStyleBlock(ast.css, source, pad))
  }

  // NOTE: There is no case for using pug/jade in svelte, so I don't think this logic is necessary.
  //
  // dedent pug/jade templates
  // const templateColumnOffset = 0
  // if (
  //   descriptor.template &&
  //   (descriptor.template.lang === 'pug' || descriptor.template.lang === 'jade')
  // ) {
  //   ;[descriptor.template.content, templateColumnOffset] = dedent(
  //     descriptor.template.content,
  //   )
  // }

  // NOTE: Disable because line and column information cannot be taken from the svelte ast...
  //
  // if (sourceMap) {
  //   const genMap = (block: SFCBlock | null, columnOffset = 0) => {
  //     if (block && !block.src) {
  //       block.map = generateSourceMap(
  //         filename,
  //         source,
  //         block.content,
  //         sourceRoot,
  //         !pad || block.type === 'template' ? block.loc.start.line - 1 : 0,
  //         columnOffset,
  //       )
  //     }
  //   }
  //   genMap(descriptor.template, templateColumnOffset)
  //   genMap(descriptor.script)
  //   descriptor.styles.forEach(s => genMap(s))
  //   descriptor.customBlocks.forEach(s => genMap(s))
  // }

  // parse CSS vars
  // TODO:
  // descriptor.cssVars = parseCssVars(descriptor)

  // check if the SFC uses :slotted
  // TODO:
  // const slottedRE = /(?:::v-|:)slotted\(/
  // descriptor.slotted = descriptor.styles.some(
  //   s => s.scoped && slottedRE.test(s.content),
  // )

  const result = {
    descriptor,
    errors
  }
  // parseCache.set(sourceKey, result)
  return result
}

// TODO: more refactoring
function createSvelteTemplateBlock(
  node: SvelteTemplateNode,
  source: string,
  pad: SvelteParseOptions['pad']
): SvelteSFCTemplateBlock {
  const type = 'template'
  const attrs: Record<string, string | true> = {}
  const content = source.slice(node.start, node.end)

  const block: SvelteSFCTemplateBlock = {
    type,
    content,
    attrs,
    loc: {
      start: {
        offset: node.start,
        line: -1, // NOTE: we can't get the line info from svelte ast ...
        column: -1 // NOTE: we can't get the column info from svelte ast ...
      },
      end: {
        offset: node.end,
        line: -1, // NOTE: we can't get the line info from svelte ast ...
        column: -1 // NOTE: we can't get the column info from svelte ast ...
      },
      source: content
    }
  }

  if (pad) {
    block.content = padContent(source, block, pad) + block.content
  }

  block.ast = node
  // TODO:
  // templateBlock.ast = createRoot(node.children, source)

  return block
}

// TODO: more refactoring
function createSvelteScriptBlock(
  node: SvelteScript,
  source: string,
  pad: SvelteParseOptions['pad']
): SvelteSFCScriptBlock {
  const type = 'script'

  const attrs: Record<string, string | true> = {}
  if (node.attributes) {
    node.attributes.forEach(attr => {
      if (isSvelteAttribute(attr)) {
        if (typeof attr.value === 'boolean') {
          attrs[attr.name] = attr.value
        } else if (
          Array.isArray(attr.value) &&
          attr.value.length > 0 &&
          isSvelteText(attr.value[0])
        ) {
          attrs[attr.name] = attr.value[0].data
        }
      }
    })
  }

  const content = source.slice(node.content.start!, node.content.end!)
  const block: SvelteSFCScriptBlock = {
    type,
    content,
    attrs,
    loc: {
      start: {
        offset: node.content.start!,
        line: -1, // NOTE: we can't get the line info from svelte ast ...
        column: -1 // NOTE: we can't get the column info from svelte ast ...
      },
      end: {
        offset: node.content.end!,
        line: -1, // NOTE: we can't get the line info from svelte ast ...
        column: -1 // NOTE: we can't get the column info from svelte ast ...
      },
      source: content
    }
  }

  if (pad) {
    block.content = padContent(source, block, pad) + block.content
  }

  block.lang = (attrs.lang as string) || 'js'

  return block
}

// TODO: more refactoring
function createSvelteStyleBlock(
  node: SvelteStyle,
  source: string,
  pad: SvelteParseOptions['pad']
): SvelteSFCStyleBlock {
  const type = 'style'

  const attrs: Record<string, string | true> = {}
  if (node.attributes) {
    node.attributes.forEach(attr => {
      if (isSvelteAttribute(attr)) {
        if (typeof attr.value === 'boolean') {
          attrs[attr.name] = attr.value
        } else if (
          Array.isArray(attr.value) &&
          attr.value.length > 0 &&
          isSvelteText(attr.value[0])
        ) {
          attrs[attr.name] = attr.value[0].data
        }
      }
    })
  }

  const content = node.content.styles
  const block: SvelteSFCStyleBlock = {
    type,
    content,
    attrs,
    loc: {
      start: {
        offset: node.content.start,
        line: -1, // NOTE: we can't get the line info from svelte ast ...
        column: -1 // NOTE: we can't get the column info from svelte ast ...
      },
      end: {
        offset: node.content.end,
        line: -1, // NOTE: we can't get the line info from svelte ast ...
        column: -1 // NOTE: we can't get the column info from svelte ast ...
      },
      source: content
    }
  }

  if (pad) {
    block.content = padContent(source, block, pad) + block.content
  }

  block.ast = node

  return block
}

const splitRE = /\r?\n/g // eslint-disable-line regexp/no-useless-flag -- FIXME
// const emptyRE = /^(?:\/\/)?\s*$/
const replaceRE = /./g

/*
function generateSourceMap(
  filename: string,
  source: string,
  generated: string,
  sourceRoot: string,
  lineOffset: number,
  columnOffset: number
): RawSourceMap {
  const map = new SourceMapGenerator({
    // eslint-disable-next-line unicorn/prefer-string-replace-all  -- FIXME
    file: filename.replace(/\\/g, '/'),
    // eslint-disable-next-line unicorn/prefer-string-replace-all  -- FIXME
    sourceRoot: sourceRoot.replace(/\\/g, '/')
  }) as unknown as CodegenSourceMapGenerator
  map.setSourceContent(filename, source)
  map._sources.add(filename)
  generated.split(splitRE).forEach((line, index) => {
    if (!emptyRE.test(line)) {
      const originalLine = index + 1 + lineOffset
      const generatedLine = index + 1
      // eslint-disable-next-line unicorn/no-for-loop
      for (let i = 0; i < line.length; i++) {
        if (!/\s/.test(line[i])) {
          map._mappings.add({
            originalLine,
            originalColumn: i + columnOffset,
            generatedLine,
            generatedColumn: i,
            source: filename,
            name: null // eslint-disable-line unicorn/no-null
          })
        }
      }
    }
  })
  return map.toJSON()
}
  */

function padContent(content: string, block: SFCBlock, pad: SvelteParseOptions['pad']): string {
  content = content.slice(0, block.loc.start.offset)
  if (pad === 'space') {
    // eslint-disable-next-line unicorn/prefer-string-replace-all -- FIXME
    return content.replace(replaceRE, ' ')
  } else {
    const offset = content.split(splitRE).length
    const padChar = block.type === 'script' && !block.lang ? '//\n' : '\n'
    return Array.from({ length: offset }).join(padChar)
  }
}
