// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vitejs/vite-plugin-vue`
// Author: Evan you (https://github.com/yyx990803), Vite team and Vue community
// Repository url: https://github.com/vitejs/vite-plugin-vue

import createDebug from 'debug'
import { preprocess } from 'svelte/compiler'
import { transformSvelteScript } from 'svelte-vapor-sfc-compiler'
import { isObject, isString } from '@vue-vapor/shared'
import { createDescriptor, getPrevDescriptor } from './descriptor'
import { genScriptCode } from './script'
import { genTemplateCode, isUseInlineTemplate as ____ } from './template'
import { genStyleCode } from './style'
import { EXPORT_HELPER_ID } from './helper'
import { createRollupError } from './utils'

import type { UnpluginOptions } from 'unplugin'
import type { ResolvedOptions, UnpluginContext } from './types'
import type { RawSourceMap } from 'source-map-js'

const debug = createDebug('unplugin-svelte-vapor:core:transform')

export async function transformMain(
  context: UnpluginContext,
  code: string,
  filename: string,
  options: ResolvedOptions,
  ssr: boolean,
  customElement: boolean
): Promise<ReturnType<Required<UnpluginOptions>['transform']> | null> {
  // const { root, isProduction } = options

  // preprocess svelte component
  const preprocessedCode = await preprocessSvelte(code, filename, options)

  const _prevDescriptor = getPrevDescriptor(filename)

  // get sfc descriptor from svelte component
  const { descriptor, errors } = createDescriptor(filename, preprocessedCode, options)
  //  debug('descriptor', descriptor)
  if (errors.length > 0) {
    errors.forEach(error => context.error(createRollupError(filename, error)))
    return null // eslint-disable-line unicorn/no-null
  }

  // feature information
  const attachedProps: [string, string][] = []
  // const hasScoped = descriptor.styles.some((s) => s.scoped)

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
      customElement
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
  const stylesCode = await genStyleCode(context, descriptor, customElement, attachedProps)
  debug('transformMain: stylesCode', stylesCode)

  const output: string[] = [
    scriptCode,
    templateCode,
    stylesCode
    // customBlocksCode,
  ]

  // if (hasScoped) {
  //   attachedProps.push([`__scopeId`, JSON.stringify(`data-v-${descriptor.id}`)])
  // }
  // if (devToolsEnabled || (devServer && !isProduction)) {
  //   // expose filename during serve for devtools to pickup
  //   attachedProps.push([
  //     `__file`,
  //     JSON.stringify(isProduction ? path.basename(filename) : filename),
  //   ])
  // }

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
  const _lang = descriptor.scriptSetup?.lang

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
  { sourcemap }: ResolvedOptions
): Promise<string> {
  const preprocessed = await preprocess(code, {
    script: ({ content }) => {
      const ret = transformSvelteScript(content, { sourcemap, id: filename })
      return {
        code: isString(ret) ? ret : ret.code,
        map: isObject(ret) ? ret.map : undefined
      }
    }
  })

  // debug('preprocessSvelte preprocessed', preprocessed)
  // TODO: we might need to return `preprocessed` directly
  return preprocessed.code
}