import { createFilter as _createFilter } from '@rollup/pluginutils'

import type { Options } from '../types'
import type { UnpluginBuildContext, UnpluginContext as _UnpluginContext } from 'unplugin'

export interface ResolvedOptions extends Options {
  filter: ReturnType<typeof _createFilter>
  sourcemap: boolean
}

export type UnpluginContext = UnpluginBuildContext & _UnpluginContext
