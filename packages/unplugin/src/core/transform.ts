import createDebug from 'debug'

import type { UnpluginOptions } from 'unplugin'
import type { ResolvedOptions } from './utils'

const debug = createDebug('unplugin-svelte-vapor:core:transform')

export function transformMain(
  code: string,
  filename: string,
  options: ResolvedOptions
): ReturnType<Required<UnpluginOptions>['transform']> {
  debug('transformMain', filename, options)
  return {
    code,
    map: {
      mappings: ''
    }
  }
}
