// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vitejs/vite-plugin-vue`
// Author: Evan you (https://github.com/yyx990803), Vite team and Vue community
// Repository url: https://github.com/vitejs/vite-plugin-vue

import createDebug from 'debug'
import { compileTemplate } from 'svelte-vapor-sfc-compiler'
import { getResolvedScript } from './script.ts'
import { createRollupError } from './utils.ts'

import type { RawSourceMap } from 'source-map-js'
import type {
  SvelteSFCDescriptor,
  SvelteSFCTemplateCompileOptions,
  SvelteSFCTemplateCompileResults
} from 'svelte-vapor-sfc-compiler'
import type { ResolvedOptions, UnpluginContext } from './types.ts'

const debug = createDebug('unplugin-svelte-vapor:core:template')

export function genTemplateCode(
  context: UnpluginContext,
  descriptor: SvelteSFCDescriptor,
  options: ResolvedOptions,
  ssr: boolean,
  customElement: boolean,
  hasScoped: boolean
): Promise<{ code: string; map: RawSourceMap | undefined }> {
  // debug('genTemplateCode', context, descriptor, options, ssr, customElement)

  const template = descriptor.template!
  // const hasScoped = descriptor.styles.some(style => style.scoped)

  // If the template is not using pre-processor AND is not using external src,
  // compile and inline it directly in the main module. When served in vite this
  // saves an extra request per SFC which can improve load performance.
  // eslint-disable-next-line unicorn/prefer-ternary
  if ((!template.lang || template.lang === 'html') && !template.src) {
    return Promise.resolve(
      transformTemplateInMain(
        context,
        template.content,
        descriptor,
        options,
        ssr,
        customElement,
        hasScoped
      ) as { code: string; map: RawSourceMap | undefined }
    )
  } else {
    // TODO:
    return Promise.resolve({
      code: '',
      map: undefined
    })
  }
}

/**
 * transform the template directly in the main SFC module
 */
export function transformTemplateInMain(
  context: UnpluginContext,
  code: string,
  descriptor: SvelteSFCDescriptor,
  options: ResolvedOptions,
  ssr: boolean,
  customElement: boolean,
  hasScoped: boolean
): SvelteSFCTemplateCompileResults {
  const result = compile(context, code, descriptor, options, ssr, customElement, hasScoped)
  return {
    ...result,
    code: result.code.replace(/\nexport (function|const) (render|ssrRender)/, '\n$1 _sfc_$2')
  }
}

export function compile(
  context: UnpluginContext,
  code: string,
  descriptor: SvelteSFCDescriptor,
  options: ResolvedOptions,
  ssr: boolean,
  _customElement: boolean,
  hasScoped: boolean
): SvelteSFCTemplateCompileResults {
  // NOTE: Do we need to process `resolveScript`?
  // resolveScript(descriptor, options, ssr, customElement)

  const filename = descriptor.filename
  const result = compileTemplate({
    ...resolveTemplateCompilerOptions(descriptor, options, ssr, hasScoped)!,
    source: code
  })

  if (result.errors.length > 0) {
    result.errors.forEach(error =>
      context.error(
        typeof error === 'string'
          ? { id: filename, message: error }
          : createRollupError(filename, error)
      )
    )
  }

  if (result.tips.length > 0) {
    result.tips.forEach(tip =>
      context.warn({
        id: filename,
        message: tip
      })
    )
  }

  return result
}

export function resolveTemplateCompilerOptions(
  descriptor: SvelteSFCDescriptor,
  options: ResolvedOptions,
  ssr: boolean,
  hasScoped: boolean
): Omit<SvelteSFCTemplateCompileOptions, 'source'> | undefined {
  const block = descriptor.template
  if (!block) {
    return
  }

  // NOTE: Do we need to process `getResolvedScript`?
  const resolvedScript = getResolvedScript(descriptor, ssr)
  // const hasScoped = descriptor.styles.some(s => s.scoped)

  const { filename, cssVars } = descriptor
  const id = descriptor.id || descriptor.filename

  // TODO: let transformAssetUrls = options.template?.transformAssetUrls
  const transformAssetUrls: boolean | Record<string, unknown> = false
  // compiler-sfc should export `AssetURLOptions`
  // let _assetUrlOptions //: AssetURLOptions | undefined

  if (transformAssetUrls === false) {
    // if explicitly disabled, let assetUrlOptions be undefined
    debug('resolveTemplateCompilerOptions: transformAssetUrls is disabled')
  } else if (options.devServer) {
    // during dev, inject vite base so that compiler-sfc can transform
    // relative paths directly to absolute paths without incurring an extra import
    // request
    // TODO:
    // if (filename.startsWith(options.root)) {
    //   const devBase = options.devServer.config.base
    //   assetUrlOptions = {
    //     base:
    //       (options.devServer.config.server?.origin ?? '') +
    //       devBase +
    //       slash(path.relative(options.root, path.dirname(filename))),
    //     includeAbsolute: !!devBase,
    //   }
    // }
  } else {
    // build: force all asset urls into import requests so that they go through
    // the assets plugin for asset registration
    // TODO:
    // assetUrlOptions = {
    //   includeAbsolute: true
    // }
  }

  // if (transformAssetUrls && typeof transformAssetUrls === 'object') {
  //   // presence of array fields means this is raw tags config
  //   transformAssetUrls = Object.values(transformAssetUrls).some((val) => Array.isArray(val)) ? {
  //     ...assetUrlOptions,
  //     tags: transformAssetUrls as any,
  //   } : { ...assetUrlOptions, ...transformAssetUrls };
  // } else {
  //   transformAssetUrls = assetUrlOptions
  // }

  // let preprocessOptions = block.lang && options.template?.preprocessOptions
  // if (block.lang === 'pug') {
  //   preprocessOptions = {
  //     doctype: 'html',
  //     ...preprocessOptions,
  //   }
  // }

  // if using TS, support TS syntax in template expressions
  // TODO:
  // const expressionPlugins: CompilerOptions['expressionPlugins'] =
  //   options.template?.compilerOptions?.expressionPlugins || []
  // const lang = descriptor.scriptSetup?.lang || descriptor.script?.lang
  // if (lang && /tsx?$/.test(lang) && !expressionPlugins.includes('typescript')) {
  //   expressionPlugins.push('typescript')
  // }

  return {
    // ...options.template,
    id,
    ast: descriptor.template?.ast,
    filename,
    scoped: hasScoped,
    slotted: descriptor.slotted,
    isProd: options.isProduction,
    inMap: block.src ? undefined : block.map,
    ssr,
    ssrCssVars: cssVars,
    transformAssetUrls,
    preprocessLang: block.lang === 'html' ? undefined : block.lang,
    // preprocessOptions,
    compilerOptions: {
      // ...options.template?.compilerOptions,
      scopeId: hasScoped ? `data-v-${id}` : undefined,
      bindingMetadata: resolvedScript ? resolvedScript.bindings : undefined,
      // expressionPlugins,
      sourceMap: options.sourcemap
    }
  }
}

export function isUseInlineTemplate(
  descriptor: SvelteSFCDescriptor,
  _options: ResolvedOptions
): boolean {
  debug(
    `isUseInlineTemplate scriptSetup=${!!descriptor.scriptSetup}, template.src=${!descriptor.template?.src}`
  )
  return (
    // !options.devServer &&
    // !options.devToolsEnabled &&
    !!descriptor.scriptSetup && !descriptor.template?.src
  )
}
