// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)

import createDebug from 'debug'
// import { isObject, isString } from '@vue-vapor/shared'
// import { EXPORT_HELPER_ID } from './helper'
// import { createRollupError } from './utils'

import type { UnpluginOptions } from 'unplugin'
import type { ResolvedOptions, UnpluginContext } from './types'
// import type { RawSourceMap } from 'source-map-js'

const debug = createDebug('unplugin-react-vapor:core:transform')

export function transformMain(
  _context: UnpluginContext,
  code: string,
  _filename: string,
  _options: ResolvedOptions,
  _ssr: boolean,
  _customElement: boolean
): ReturnType<Required<UnpluginOptions>['transform']> {
  // const { root, isProduction } = options
  debug('transforming ...', code)

  return {
    code,
    map: {
      mappings: ''
    }
  }
}
