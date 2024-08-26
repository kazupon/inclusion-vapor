// SPDX-License-Identifier: MIT
// Author: kazuya kawaguchi (a.k.a. kazupon)

import { createFilter as _createFilter } from '@rollup/pluginutils'

import type { Options, ReactBabelOptions, ReactBabelHookContext } from '../types.ts'
import type { UnpluginBuildContext, UnpluginContext as _UnpluginContext } from 'unplugin'

export interface ResolvedOptions extends Options {
  filter: ReturnType<typeof _createFilter>
  root: string
  isProduction: boolean
  devBase: string
  skipFastRefresh: boolean
  jsxImportRuntime: string
  jsxImportDevRuntime: string
  runPluginOverrides?: (options: ReactBabelOptions, context: ReactBabelHookContext) => void
  staticBabelOptions?: ReactBabelOptions
}

export type UnpluginContext = UnpluginBuildContext & _UnpluginContext
