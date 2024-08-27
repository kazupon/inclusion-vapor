// SPDX-License-Identifier: MIT
// Author: kazuya kawaguchi (a.k.a. kazupon)

import { createFilter } from '@rollup/pluginutils'

import type { Options } from '../types.ts'
import type { ResolvedOptions } from './types.ts'

const RE_DEFAULT_INCLUDE = /\.[jt]sx$/

export function resolveOptions(options: Options): ResolvedOptions {
  const filter = createFilter(options.include ?? RE_DEFAULT_INCLUDE, options.exclude)

  // Provide default values for Rollup compat.
  const devBase = '/'
  const root = process.cwd()
  const isProduction = process.env.NODE_ENV === 'production'

  return {
    ...options,
    filter,
    devBase,
    root,
    isProduction
  }
}
