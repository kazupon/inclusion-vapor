// SPDX-License-Identifier: MIT
// Author: kazuya kawaguchi (a.k.a. kazupon)

import { createFilter } from '@rollup/pluginutils'
import path from 'node:path'
import { createHash } from 'node:crypto'

import type { Options } from '../types'
import type { ResolvedOptions } from './types'
import type { SvelteSFCBlock, CompilerError } from 'svelte-vapor-sfc-compiler'
import type { RollupError } from 'rollup'

export function resolveOptions(options: Options): ResolvedOptions {
  options.include ||= /\.svelte$/

  const filter = createFilter(options.include, options.exclude)
  const root = process.cwd()
  const isProduction = process.env.NODE_ENV === 'production'
  const sourcemap = false

  return { ...options, filter, root, isProduction, sourcemap }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SvelteQuery {
  // TODO: add more
}

export function parseRequestQuery(id: string): {
  filename: string
  query: Record<string, string>
} {
  const [filename, rawQuery] = id.split(`?`, 2)
  const query = Object.fromEntries(new URLSearchParams(rawQuery))

  return {
    filename,
    query
  }
}

// Forked from `@vitejs/vite-plugin-vue`
// Author: Evan you (https://github.com/yyx990803), Vite team and Vue community
// Repository url: https://github.com/vitejs/vite-plugin-vue

// these are built-in query parameters so should be ignored
// if the user happen to add them as attrs
const ignoreList = new Set(['id', 'index', 'src', 'type', 'lang', 'module', 'scoped', 'generic'])

export function attrsToQuery(
  attrs: SvelteSFCBlock['attrs'],
  langFallback?: string,
  forceLangFallback = false
): string {
  let query = ``
  for (const name in attrs) {
    const value = attrs[name]
    if (!ignoreList.has(name)) {
      query += `&${encodeURIComponent(name)}${value ? `=${encodeURIComponent(value)}` : ``}`
    }
  }
  if (langFallback || attrs.lang) {
    query +=
      `lang` in attrs
        ? forceLangFallback
          ? `&lang.${langFallback}`
          : `&lang.${attrs.lang}`
        : `&lang.${langFallback}`
  }
  return query
}

export function createRollupError(id: string, error: CompilerError | SyntaxError): RollupError {
  const { message, name, stack } = error
  const rollupError: RollupError = {
    id,
    plugin: 'vue',
    message,
    name,
    stack
  }

  if ('code' in error && error.loc) {
    rollupError.loc = {
      file: id,
      line: error.loc.start.line,
      column: error.loc.start.column
    }
  }

  return rollupError
}

// Forked from `vite`
// Author: Evan you (https://github.com/yyx990803), Vite team and Vite community
// Repository url: https://github.com/vitejs/vite

const isWindows: boolean = typeof process !== 'undefined' && process.platform === 'win32'

const windowsSlashRE = /\\/g

function slash(p: string): string {
  // eslint-disable-next-line unicorn/prefer-string-replace-all -- FIXME
  return p.replace(windowsSlashRE, '/')
}

export function normalizePath(id: string): string {
  return path.posix.normalize(isWindows ? slash(id) : id)
}

export function getHash(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 8)
}
