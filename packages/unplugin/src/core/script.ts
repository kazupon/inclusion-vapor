// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vitejs/vite-plugin-vue`
// Author: Evan you (https://github.com/yyx990803), Vite team and Vue community
// Repository url: https://github.com/vitejs/vite-plugin-vue

import createDebug from 'debug'
import path from 'node:path'
import { compileScript } from 'svelte-vapor-sfc-compiler'
import { isUseInlineTemplate } from './template'
import { attrsToQuery } from './utils'

import type { SvelteSFCDescriptor, SvelteSFCScriptBlock } from 'svelte-vapor-sfc-compiler'
import type { RawSourceMap } from 'source-map-js'
import type { ResolvedOptions, UnpluginContext } from './types'

const debug = createDebug('unplugin-svelte-vapor:core:script')

export const scriptIdentifier = `_sfc_main`

export function genScriptCode(
  _context: UnpluginContext,
  descriptor: SvelteSFCDescriptor,
  options: ResolvedOptions,
  ssr: boolean,
  customElement: boolean
): Promise<{ code: string; map: RawSourceMap | undefined }> {
  // debug('genScriptCode', context, descriptor, options, ssr, customElement)

  let scriptCode = `const ${scriptIdentifier} = {}`
  let map: RawSourceMap | undefined

  const script = resolveScript(descriptor, options, ssr, customElement)
  if (script) {
    // If the script is js/ts and has no external src, it can be directly placed
    // in the main module.
    if (canInlineMain(descriptor, options)) {
      scriptCode = script.content
      map = script.map
    } else {
      // TODO: support src imports
      // if (script.src) {
      //   await linkSrcToDescriptor(script.src, descriptor, pluginContext, false)
      // }
      const src = script.src || descriptor.filename
      const langFallback = (script.src && path.extname(src).slice(1)) || 'js'
      const attrsQuery = attrsToQuery(script.attrs, langFallback)
      const srcQuery = script.src ? `&src=true` : ``
      const query = `?svelte&type=script${srcQuery}${attrsQuery}`
      const request = JSON.stringify(src + query)
      debug('genScriptCode request', request)
      scriptCode = `import _sfc_main from ${request}\n` + `export * from ${request}` // support named exports
    }
  }

  return Promise.resolve({
    code: scriptCode,
    map
  })
}

export const typeDepToSFCMap: Map<string, Set<string>> = new Map<string, Set<string>>()

export function resolveScript(
  descriptor: SvelteSFCDescriptor,
  options: ResolvedOptions,
  ssr: boolean,
  customElement: boolean
): SvelteSFCScriptBlock | null {
  if (/*!descriptor.script && */ !descriptor.scriptSetup) {
    return null // eslint-disable-line unicorn/no-null
  }

  const cached = getResolvedScript(descriptor, ssr)
  if (cached) {
    return cached
  }

  let resolved: SvelteSFCScriptBlock | null = null // eslint-disable-line unicorn/no-null

  debug(
    `resolving script ... isProd = ${options.isProduction}, inlineTemplate = ${isUseInlineTemplate(descriptor, options)}`
  )
  resolved = compileScript(descriptor, {
    // ...options.script,
    id: descriptor.id || descriptor.filename,
    isProd: options.isProduction,
    // NOTE: off
    // inlineTemplate: isUseInlineTemplate(descriptor, options),
    inlineTemplate: false,
    // templateOptions: resolveTemplateCompilerOptions(descriptor, options, ssr),
    sourceMap: options.sourcemap,
    genDefaultAs: canInlineMain(descriptor, options) ? scriptIdentifier : undefined,
    customElement
    // propsDestructure:
    //   options.features?.propsDestructure ?? options.script?.propsDestructure,
  })

  if (!options.isProduction && resolved?.deps) {
    for (const [key, sfcs] of typeDepToSFCMap) {
      if (sfcs.has(descriptor.filename) && !resolved.deps.includes(key)) {
        sfcs.delete(descriptor.filename)
      }
    }

    for (const dep of resolved.deps) {
      const existingSet = typeDepToSFCMap.get(dep)
      if (existingSet) {
        existingSet.add(descriptor.filename)
      } else {
        typeDepToSFCMap.set(dep, new Set([descriptor.filename]))
      }
    }
  }

  setResolvedScript(descriptor, resolved, ssr)
  return resolved
}

// ssr and non ssr builds would output different script content
let clientCache = new WeakMap<SvelteSFCDescriptor, SvelteSFCScriptBlock | null>()
let ssrCache = new WeakMap<SvelteSFCDescriptor, SvelteSFCScriptBlock | null>()

export function getResolvedScript(
  descriptor: SvelteSFCDescriptor,
  ssr: boolean
): SvelteSFCScriptBlock | null | undefined {
  return (ssr ? ssrCache : clientCache).get(descriptor)
}

export function setResolvedScript(
  descriptor: SvelteSFCDescriptor,
  script: SvelteSFCScriptBlock,
  ssr: boolean
): void {
  ;(ssr ? ssrCache : clientCache).set(descriptor, script)
}

export function clearScriptCache(): void {
  clientCache = new WeakMap()
  ssrCache = new WeakMap()
}

// If the script is js/ts and has no external src, it can be directly placed
// in the main module. Skip for build
function canInlineMain(descriptor: SvelteSFCDescriptor, _options: ResolvedOptions): boolean {
  if (/*descriptor.script?.src || */ descriptor.scriptSetup?.src) {
    return false
  }
  const lang = /*descriptor.script?.lang || */ descriptor.scriptSetup?.lang
  if (!lang || lang === 'js') {
    return true
  }
  if (lang === 'ts' /* && options.devServer*/) {
    return true
  }
  return false
}
