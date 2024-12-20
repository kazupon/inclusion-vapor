// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vitejs/vite-plugin-vue`
// Author: Evan you (https://github.com/yyx990803), Vite team and Vue community
// Repository url: https://github.com/vitejs/vite-plugin-vue

import createDebug from 'debug'
import fs from 'node:fs'
import path from 'node:path'
import { hash, parse as parseSvelteSFC } from 'svelte-vapor-sfc-compiler'
import { normalizePath } from './utils.ts'

import type { SvelteSFCDescriptor, SvelteSFCParseResult } from 'svelte-vapor-sfc-compiler'
import type { ResolvedOptions } from './types.ts'

const debug = createDebug('unplugin-svelte-vapor:core:descriptor')

export const cache: Map<string, SvelteSFCDescriptor> = new Map<string, SvelteSFCDescriptor>()
// we use a separate descriptor cache for HMR purposes.
// The main cached descriptors are parsed from SFCs that may have been
// transformed by other plugins, e.g. vue-macros;
// The HMR cached descriptors are based on the raw, pre-transform SFCs.
export const hmrCache: Map<string, SvelteSFCDescriptor> = new Map<string, SvelteSFCDescriptor>()
const prevCache = new Map<string, SvelteSFCDescriptor | undefined>()

export function createDescriptor(
  filename: string,
  source: string,
  { root, isProduction, sourcemap }: ResolvedOptions,
  hmr = false
): SvelteSFCParseResult {
  // parse svelte component
  const { descriptor, errors } = parseSvelteSFC(source, {
    filename,
    sourceMap: sourcemap
  })

  // ensure the path is normalized in a way that is consistent inside
  // project (relative to root) and on different systems.
  const normalizedPath = normalizePath(path.relative(root, filename))
  descriptor.id = hash(normalizedPath + (isProduction ? source : ''))
  ;(hmr ? hmrCache : cache).set(filename, descriptor)

  debug('createDescriptor', filename, descriptor.id)
  return { descriptor, errors }
}

export function getPrevDescriptor(filename: string): SvelteSFCDescriptor | undefined {
  return prevCache.get(filename)
}

export function invalidateDescriptor(filename: string, hmr = false): void {
  const _cache = hmr ? hmrCache : cache
  const prev = _cache.get(filename)
  _cache.delete(filename)
  if (prev) {
    prevCache.set(filename, prev)
  }
}

export function getDescriptor(
  filename: string,
  options: ResolvedOptions,
  createIfNotFound = true,
  hmr = false,
  code?: string
): SvelteSFCDescriptor | undefined {
  const _cache = hmr ? hmrCache : cache
  if (_cache.has(filename)) {
    return _cache.get(filename)!
  }
  if (createIfNotFound) {
    const { descriptor, errors } = createDescriptor(
      filename,
      code ?? fs.readFileSync(filename, 'utf8'),
      options,
      hmr
    )
    if (errors.length > 0 && !hmr) {
      throw errors[0]
    }
    return descriptor
  }
}
