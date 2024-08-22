// SPDX-License-Identifier: MIT
// Author: kazuya kawaguchi (a.k.a. kazupon)

import { createFilter } from '@rollup/pluginutils'

import type { Options } from '../types'
import type { ResolvedOptions } from './types'
import type { RollupError } from 'rollup'

export function resolveOptions(options: Options): ResolvedOptions {
  options.include ||= /\.(jsx|tsx)$/

  const filter = createFilter(options.include, options.exclude)
  const root = process.cwd()
  const isProduction = process.env.NODE_ENV === 'production'
  const sourcemap = false

  return { ...options, filter, root, isProduction, sourcemap }
}

export function createRollupError(id: string, error: SyntaxError): RollupError {
  const { message, name, stack } = error
  const rollupError: RollupError = {
    id,
    plugin: 'unplugin-react-vapor',
    message,
    name,
    stack
  }

  // if ('code' in error && error.loc) {
  //   rollupError.loc = {
  //     file: id,
  //     line: error.loc.start.line,
  //     column: error.loc.start.column
  //   }
  // }

  return rollupError
}
