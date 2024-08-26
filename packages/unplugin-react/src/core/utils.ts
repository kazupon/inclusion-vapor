// SPDX-License-Identifier: MIT
// Author: kazuya kawaguchi (a.k.a. kazupon)

import { createFilter } from '@rollup/pluginutils'

import type { RollupError } from 'rollup'
import type { Options } from '../types.ts'
import type { ResolvedOptions } from './types.ts'

const RE_DEFAULT_INCLUDE = /\.[jt]sx$/

export function resolveOptions(options: Options): ResolvedOptions {
  const filter = createFilter(options.include ?? RE_DEFAULT_INCLUDE, options.exclude)
  const jsxImportSource = (options.jsxImportSource ??= 'react')
  const jsxImportRuntime = `${jsxImportSource}/jsx-runtime`
  const jsxImportDevRuntime = `${jsxImportSource}/jsx-dev-runtime`

  // Provide default values for Rollup compat.
  const devBase = '/'
  const root = process.cwd()
  const isProduction = process.env.NODE_ENV === 'production'
  const skipFastRefresh = false

  return {
    ...options,
    filter,
    devBase,
    root,
    isProduction,
    skipFastRefresh,
    jsxImportRuntime,
    jsxImportDevRuntime
  }
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
