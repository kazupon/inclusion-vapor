// SPDX-License-Identifier: MIT
// Author: kazuya kawaguchi (a.k.a. kazupon)

import { createFilter as _createFilter } from '@rollup/pluginutils'

import type { Options } from '../types'
import type { UnpluginBuildContext, UnpluginContext as _UnpluginContext } from 'unplugin'

export interface ResolvedOptions extends Options {
  filter: ReturnType<typeof _createFilter>
  root: string
  isProduction: boolean
  sourcemap: boolean
}

export type UnpluginContext = UnpluginBuildContext & _UnpluginContext
