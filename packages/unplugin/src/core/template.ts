// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vitejs/vite-plugin-vue`
// Author: Evan you (https://github.com/yyx990803), Vite team and Vue community
// Repository url: https://github.com/vitejs/vite-plugin-vue

import createDebug from 'debug'

import type { SvelteSFCDescriptor } from 'svelte-vapor-sfc-compiler'
import type { ResolvedOptions, UnpluginContext } from './types'

const debug = createDebug('unplugin-svelte-vapor:core:template')

export async function genTemplateCode(
  context: UnpluginContext,
  descriptor: SvelteSFCDescriptor,
  options: ResolvedOptions,
  ssr: boolean,
  customElement: boolean
): Promise<{ code: string; map: object }> {
  debug('genTemplateCode', context, descriptor, options, ssr, customElement)

  // TODO:
  await Promise.resolve()

  return {
    code: '',
    map: {}
  }
}

export function isUseInlineTemplate(
  descriptor: SvelteSFCDescriptor,
  _options: ResolvedOptions
): boolean {
  return (
    // !options.devServer &&
    // !options.devToolsEnabled &&
    // !!descriptor.scriptSetup &&
    !descriptor.template?.src
  )
}
