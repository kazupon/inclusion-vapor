// SPDX-License-Identifier: MIT
// Author: kazuya kawaguchi (a.k.a. kazupon)

import { /*isObject, */ generateCodeFrame } from '@vue-vapor/shared'
import { SourceMapConsumer, SourceMapGenerator } from 'source-map-js'
import {
  compile as compileSvelteVapor,
  createScopedCssApplyer
} from 'svelte-vapor-template-compiler'
// NOTE: we need to import use exports path..., but vitest cannot handle it.
// import { createScopedCssApplyer } from 'svelte-vapor-template-compiler/style'
import { parse as parseSvelte } from 'svelte/compiler'
// import { normalizeOptions, createAssetUrlTransformWithOptions } from './template/transformAssetUrl'
import { generate as generateId, getShortId } from './id.ts'
import { genCssVarsFromList } from './style/cssVars.ts'
import { warnOnce } from './warn.ts'

import type { CompilerError, RawSourceMap } from '@vue-vapor/compiler-dom'
import type { NodeTransform, ScopedCssApplyer } from 'svelte-vapor-template-compiler'
import type {
  SvelteSFCTemplateCompileOptions,
  SvelteSFCTemplateCompileResults,
  SvelteTemplateCompiler
} from './types.ts'

export function compileTemplate(
  options: SvelteSFCTemplateCompileOptions
): SvelteSFCTemplateCompileResults {
  // TODO:
  // svelve has preprocessors (`import { preprocessor } from 'svelte/compiler'`) for template
  // so we need to decide how to handle it.
  return doCompileTemplate(options)
}

function doCompileTemplate({
  filename,
  id,
  scoped,
  slotted,
  inMap,
  source,
  ast: inAST,
  ssr = false,
  // vapor = true,
  ssrCssVars,
  isProd = false,
  compiler,
  compilerOptions = {}
  // transformAssetUrls,
}: SvelteSFCTemplateCompileOptions): SvelteSFCTemplateCompileResults {
  const errors: CompilerError[] = []
  const warnings: CompilerError[] = []

  const nodeTransforms: NodeTransform[] = []
  // TODO: handle assets for svelte
  // if (isObject(transformAssetUrls)) {
  //   const assetOptions = normalizeOptions(transformAssetUrls)
  //   nodeTransforms = [
  //     createAssetUrlTransformWithOptions(assetOptions),
  //     createSrcsetTransformWithOptions(assetOptions),
  //   ]
  // } else if (transformAssetUrls !== false) {
  //   nodeTransforms = [transformAssetUrl, transformSrcset]
  // }

  if (ssr && !ssrCssVars) {
    warnOnce(
      `compileTemplate is called with \`ssr: true\` but no ` + `corresponding \`cssVars\` option.`
    )
  }
  if (!id) {
    warnOnce(`compileTemplate now requires the \`id\` option.`)
    id = ''
  }

  const shortId = getShortId(id)
  const longId = generateId(shortId)

  // TODO: ssr
  const templateCompiler: SvelteTemplateCompiler = compiler ?? {
    compile: compileSvelteVapor,
    parse: parseSvelte
  }
  // if (compiler !== defaultCompiler) {
  //   // user using custom compiler, this means we cannot reuse the AST from
  //   // the descriptor as they might be different.
  //   inAST = undefined
  // }

  let scopedCssApplyer: ScopedCssApplyer | undefined = compilerOptions.scopedCssApplyer
  if (!scopedCssApplyer && compilerOptions.css) {
    scopedCssApplyer = createScopedCssApplyer({
      ast: compilerOptions.css,
      source,
      dev: !isProd,
      cssHash: longId
    })
  }

  const ret = templateCompiler.compile(inAST || source, {
    mode: 'module',
    prefixIdentifiers: true,
    hoistStatic: true,
    cacheHandlers: true,
    ssrCssVars:
      ssr && ssrCssVars && ssrCssVars.length > 0
        ? genCssVarsFromList(ssrCssVars, shortId, isProd, true)
        : '',
    scopeId: scoped ? longId : undefined,
    slotted,
    sourceMap: true,
    parser: (source: string) => templateCompiler.parse(source),
    ...compilerOptions,
    scopedCssApplyer,
    hmr: !isProd,
    // eslint-disable-next-line unicorn/prefer-spread -- FIXME: spread operator
    nodeTransforms: nodeTransforms.concat(compilerOptions.nodeTransforms || []),
    filename,
    onError: e => errors.push(e),
    onWarn: w => warnings.push(w)
  })

  const { code, ast, preamble, helpers } = ret
  let { map } = ret

  // inMap should be the map produced by ./parse.ts which is a simple line-only
  // mapping. If it is present, we need to adjust the final map and errors to
  // reflect the original line numbers.
  if (inMap && !inAST) {
    if (map) {
      map = mapLines(inMap, map)
    }
    if (errors.length > 0) {
      patchErrors(errors, source, inMap)
    }
  }

  const tips = warnings.map(w => {
    let msg = w.message
    if (w.loc) {
      msg += `\n${generateCodeFrame(
        (inAST as unknown as { source: string }).source || source,
        w.loc.start.offset,
        w.loc.end.offset
      )}`
    }
    return msg
  })

  return {
    code,
    ast,
    preamble,
    source,
    errors,
    tips,
    map,
    helpers
  }
}

function mapLines(oldMap: RawSourceMap, newMap: RawSourceMap): RawSourceMap {
  if (!oldMap) return newMap
  if (!newMap) return oldMap

  const oldMapConsumer = new SourceMapConsumer(oldMap)
  const newMapConsumer = new SourceMapConsumer(newMap)
  const mergedMapGenerator = new SourceMapGenerator()

  newMapConsumer.eachMapping(m => {
    if (m.originalLine == undefined) {
      return
    }

    const origPosInOldMap = oldMapConsumer.originalPositionFor({
      line: m.originalLine,
      column: m.originalColumn
    })

    if (origPosInOldMap.source == undefined) {
      return
    }

    mergedMapGenerator.addMapping({
      generated: {
        line: m.generatedLine,
        column: m.generatedColumn
      },
      original: {
        line: origPosInOldMap.line, // map line
        // use current column, since the oldMap produced by @vue/compiler-sfc
        // does not
        column: m.originalColumn
      },
      source: origPosInOldMap.source,
      name: origPosInOldMap.name
    })
  })

  // source-map's type definition is incomplete
  const generator = mergedMapGenerator as any // eslint-disable-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  ;(oldMapConsumer as any).sources.forEach((sourceFile: string) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    generator._sources.add(sourceFile)
    const sourceContent = oldMapConsumer.sourceContentFor(sourceFile)
    if (sourceContent != undefined) {
      mergedMapGenerator.setSourceContent(sourceFile, sourceContent)
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  generator._sourceRoot = oldMap.sourceRoot
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  generator._file = oldMap.file

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
  return generator.toJSON()
}

function patchErrors(errors: CompilerError[], source: string, inMap: RawSourceMap) {
  const originalSource = inMap.sourcesContent![0]
  const offset = originalSource.indexOf(source)
  const lineOffset = originalSource.slice(0, offset).split(/\r?\n/).length - 1
  errors.forEach(err => {
    if (err.loc) {
      err.loc.start.line += lineOffset
      err.loc.start.offset += offset
      if (err.loc.end !== err.loc.start) {
        err.loc.end.line += lineOffset
        err.loc.end.offset += offset
      }
    }
  })
}
