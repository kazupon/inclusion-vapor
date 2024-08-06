import { createFilter } from '@rollup/pluginutils'

import type { Options } from '../types'

export interface ResolvedOptions extends Options {
  filter: ReturnType<typeof createFilter>
}

export function resolveOptions(options: Options): ResolvedOptions {
  options.include ||= /\.svelte$/
  const filter = createFilter(options.include, options.exclude)

  return { ...options, filter }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SvelteQuery {
  // TODO: add more
}

export function parseRequestQuery(id: string): {
  filename: string
  query: Record<string, string>
} {
  const [filename, rawQuery] = id.split(`?`, 2)
  const query = Object.fromEntries(new URLSearchParams(rawQuery))

  return {
    filename,
    query
  }
}
