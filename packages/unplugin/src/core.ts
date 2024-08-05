import { createFilter } from '@rollup/pluginutils'
import createDebug from 'debug'

import type { Options } from './types'

const debug = createDebug('unplugin-svelte-vapor:core')

export interface ResolvedOptions extends Options {
  filter: ReturnType<typeof createFilter>
}

export function resolveOptions(options: Options): ResolvedOptions {
  debug('call resolveOptions')

  options.include ||= /\.svelte$/
  const filter = createFilter(options.include, options.exclude)

  return { ...options, filter }
}
