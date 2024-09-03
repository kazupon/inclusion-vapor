// SPDX-License-Identifier: MIT
// Author: kazuya kawaguchi (a.k.a. kazupon)

import type { createFilter as _createFilter } from '@rollup/pluginutils'

import type { UnpluginBuildContext, UnpluginContext as _UnpluginContext } from 'unplugin'
import type { Options } from '../types.ts'

export interface ResolvedOptions extends Options {
  filter: ReturnType<typeof _createFilter>
  root: string
  isProduction: boolean
  devBase: string
}

export type UnpluginContext = UnpluginBuildContext & _UnpluginContext
