// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vitejs/vite-plugin-vue`
// Author: Evan you (https://github.com/yyx990803), Vite team and Vue community
// Repository url: https://github.com/vitejs/vite-plugin-vue

import createDebug from 'debug'

import type { SvelteSFCDescriptor } from 'svelte-vapor-sfc-compiler'
import type { UnpluginContext } from './types'

const debug = createDebug('unplugin-svelte-vapor:core:style')

export async function genStyleCode(
  context: UnpluginContext,
  descriptor: SvelteSFCDescriptor,
  customElement: boolean,
  attachedProps: [string, string][]
): Promise<string> {
  debug('genStyleCode', context, descriptor, customElement, attachedProps)

  const stylesCode = ``

  // TODO:
  await Promise.resolve()

  return stylesCode
}
