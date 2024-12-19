// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vitejs/vite-plugin-vue`
// Author: Evan you (https://github.com/yyx990803), Vite team and Vue community
// Repository url: https://github.com/vitejs/vite-plugin-vue

import { isObject, isString } from '@vue-vapor/shared'
import createDebug from 'debug'
import path from 'node:path'
import {
  compileStyleAsync,
  generate as generateId,
  parseSvelteScript,
  transformSvelteScript
} from 'svelte-vapor-sfc-compiler'
import { preprocess } from 'svelte/compiler'
import { createDescriptor } from './descriptor.ts'
import { EXPORT_HELPER_ID } from './helper.ts'
import { genScriptCode } from './script.ts'
import { genStyleCode } from './style.ts'
import { genTemplateCode } from './template.ts'
import { createRollupError } from './utils.ts'

import type { RawSourceMap } from 'source-map-js'
import type { SvelteSFCDescriptor, SvelteSFCStyleBlock } from 'svelte-vapor-sfc-compiler'
import type { UnpluginOptions } from 'unplugin'
import type { ResolvedOptions, UnpluginContext } from './types.ts'

const debug = createDebug('unplugin-svelte-vapor:core:transform')

export async function transformMain(
  context: UnpluginContext,
  code: string,
  filename: string,
  options: ResolvedOptions,
  ssr: boolean,
  customElement: boolean
): Promise<ReturnType<Required<UnpluginOptions>['transform']> | null> {
  const { isProduction, devServer, devToolsEnabled } = options
  debug('transformMain', code, filename)

  // preprocess svelte component
  const preprocessedCode = await preprocessSvelte(code, filename, options)
  debug('transformMain preprocessedCode', preprocessedCode, filename)

  // const _prevDescriptor = getPrevDescriptor(filename)

  // get sfc descriptor from svelte component
  const { descriptor, errors } = createDescriptor(filename, preprocessedCode, options)
  //  debug('descriptor', descriptor)
  if (errors.length > 0) {
    errors.forEach(error => context.error(createRollupError(filename, error)))
    return null // eslint-disable-line unicorn/no-null
  }

  // feature information
  const attachedProps: [string, string][] = []
  const hasScoped = true // descriptor.styles.some(s => s.scoped) // default scoped on svelte

  // generate script code
  const { code: scriptCode, map: _scriptMap } = await genScriptCode(
    context,
    descriptor,
    options,
    ssr,
    customElement
  )
  debug('transformMain: scriptCode', scriptCode)

  // template
  // TODO: const hasTemplateImport = !!descriptor.template && !isUseInlineTemplate(descriptor, options)
  const hasTemplateImport = !!descriptor.template
  debug('transformMain: hasTemplateImport', hasTemplateImport)

  let templateCode = ''
  let templateMap: RawSourceMap | undefined = undefined
  if (hasTemplateImport) {
    ;({ code: templateCode, map: templateMap } = await genTemplateCode(
      context,
      descriptor,
      options,
      ssr,
      customElement,
      hasScoped
    ))
  }
  debug('transformMain: templateCode', templateCode, templateMap)

  if (hasTemplateImport) {
    attachedProps.push(ssr ? ['ssrRender', '_sfc_ssrRender'] : ['render', '_sfc_render'])
  } else {
    // TODO:
    // if (
    //   prevDescriptor &&
    //   !isEqualBlock(descriptor.template, prevDescriptor.template)
    // ) {
    //   attachedProps.push([ssr ? 'ssrRender' : 'render', '() => {}'])
    // }
  }

  // styles
  const stylesCode = genStyleCode(context, descriptor, customElement, attachedProps)
  debug('transformMain: stylesCode', stylesCode)

  const output: string[] = [
    scriptCode,
    templateCode,
    stylesCode
    // customBlocksCode,
  ]

  if (hasScoped) {
    attachedProps.push([`__scopeId`, JSON.stringify(generateId(descriptor.id!))])
  }

  if (devToolsEnabled || (devServer && !isProduction)) {
    // expose filename during serve for devtools to pickup
    attachedProps.push([
      `__file`,
      JSON.stringify(isProduction ? path.basename(filename) : filename)
    ])
  }

  // HMR
  // TODO:

  // SSR module registration by wrapping user setup
  // TODO:

  // TODO:
  /*
  let resolvedMap: RawSourceMap | undefined = undefined
  if (options.sourceMap) {
    if (scriptMap && templateMap) {
      // if the template is inlined into the main module (indicated by the presence
      // of templateMap), we need to concatenate the two source maps.

      const gen = fromMap(
        // version property of result.map is declared as string
        // but actually it is `3`
        scriptMap as Omit<RawSourceMap, 'version'> as TraceEncodedSourceMap,
      )
      const tracer = new TraceMap(
        // same above
        templateMap as Omit<RawSourceMap, 'version'> as TraceEncodedSourceMap,
      )
      const offset = (scriptCode.match(/\r?\n/g)?.length ?? 0) + 1
      eachMapping(tracer, (m) => {
        if (m.source == null) return
        addMapping(gen, {
          source: m.source,
          original: { line: m.originalLine, column: m.originalColumn },
          generated: {
            line: m.generatedLine + offset,
            column: m.generatedColumn,
          },
        })
      })

      // same above
      resolvedMap = toEncodedMap(gen) as Omit<
        GenEncodedSourceMap,
        'version'
      > as RawSourceMap
      // if this is a template only update, we will be reusing a cached version
      // of the main module compile result, which has outdated sourcesContent.
      resolvedMap.sourcesContent = templateMap.sourcesContent
    } else {
      // if one of `scriptMap` and `templateMap` is empty, use the other one
      resolvedMap = scriptMap ?? templateMap
    }
  }
  */

  if (attachedProps.length === 0) {
    output.push(`export default _sfc_main`)
  } else {
    output.push(
      `import _export_sfc from '${EXPORT_HELPER_ID}'`,
      `export default /*#__PURE__*/_export_sfc(_sfc_main, [${attachedProps
        .map(([key, val]) => `['${key}',${val}]`)
        .join(',')}])`
    )
  }

  // handle TS transpilation
  const resolvedCode = output.join('\n')
  // const _lang = descriptor.scriptSetup?.lang

  // TODO:
  // if (
  //   lang &&
  //   /tsx?$/.test(lang) &&
  //   !descriptor.script?.src // only normal script can have src
  // ) {
  //   const { code, map } = await transformWithEsbuild(
  //     resolvedCode,
  //     filename,
  //     {
  //       loader: 'ts',
  //       target: 'esnext',
  //       sourcemap: options.sourceMap,
  //     },
  //     resolvedMap,
  //   )
  //   resolvedCode = code
  //   resolvedMap = resolvedMap ? (map as any) : resolvedMap
  // }

  return {
    code: resolvedCode,
    map: {
      mappings: ''
    },
    // map: resolvedMap || {
    //   mappings: '',
    // },
    // @ts-expect-error -- FIXME
    meta: {
      vite: {
        lang: descriptor.scriptSetup?.lang || 'js'
      }
    }
  }
}

async function preprocessSvelte(
  code: string,
  filename: string,
  options: ResolvedOptions
): Promise<string> {
  const { sourcemap } = options
  debug('preprocessSvelte  ...', filename)

  // converts the required `<script context="module">` to AST in advance for `transformSvelteScript`
  const [moduleAst, moduleCode] = await preprocessSvelteScriptContext(code, filename, options)
  debug('preprocessSvelte moduleAst', moduleAst)

  // transform svelte script with use svelte preprocess
  const preprocessed = await preprocess(code, {
    script: ({ content, attributes }) => {
      if (attributes.context === 'module') {
        // if it's `<script context="module">`, keep it as is.
        return { code: content }
      }
      const ret = transformSvelteScript(content, { sourcemap, id: filename, moduleAst, moduleCode })
      return {
        code: isString(ret) ? ret : ret.code,
        map: isObject(ret) ? ret.map : undefined
      }
    }
  })

  debug('... preprocessSvelte', filename)
  // debug('preprocessSvelte preprocessed', preprocessed)
  // TODO: we might need to return `preprocessed` directly
  return preprocessed.code
}

// TODO: do we need filename and options in this function?
async function preprocessSvelteScriptContext(
  code: string,
  _filename: string,
  _options: ResolvedOptions
): Promise<[ReturnType<typeof parseSvelteScript> | undefined, string | undefined]> {
  let moduleAst: ReturnType<typeof parseSvelteScript> | undefined
  let moduleCode: string | undefined
  await preprocess(code, {
    script: params => {
      if (
        params.attributes.context === 'module' &&
        moduleAst == undefined &&
        moduleCode == undefined
      ) {
        moduleAst = parseSvelteScript(params.content)
        moduleCode = params.content
      }
    }
  })
  return [moduleAst, moduleCode]
}

export async function transformStyle(
  code: string,
  descriptor: SvelteSFCDescriptor,
  index: number,
  options: ResolvedOptions,
  context: UnpluginContext,
  filename: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ code: string; map: any } | null> {
  const block = descriptor.styles[index] as SvelteSFCStyleBlock

  const result = await compileStyleAsync({
    filename: descriptor.filename,
    id: generateId(descriptor.id!),
    isProd: options.isProduction,
    source: code,
    scoped: block.scoped,
    ast: block.ast!,
    ...(options.cssDevSourcemap
      ? {
          postcssOptions: {
            map: {
              from: filename,
              inline: false,
              annotation: false
            }
          }
        }
      : {})
  })
  debug('transformStyle result', result)

  if (result.errors.length > 0) {
    type CompilerError = {
      line: number
      column: number
      loc: { line: number; column: number; file: string }
    }
    ;(result.errors as unknown as CompilerError[]).forEach(error => {
      if (error.line && error.column) {
        error.loc = {
          file: descriptor.filename,
          line: error.line + block.loc.start.line,
          column: error.column
        }
      }
      context.error(error as unknown as string)
    })

    // eslint-disable-next-line unicorn/no-null
    return null
  }

  // const map = result.map
  //   ? await formatPostcssSourceMap(
  //     // version property of result.map is declared as string
  //     // but actually it is a number
  //     result.map as Omit<RawSourceMap, 'version'> as ExistingRawSourceMap,
  //     filename,
  //   )
  //   : ({ mappings: '' } as any)
  const map = result.map

  const resolvedCode = code
  return {
    code: resolvedCode,
    map
  }
}
