// SPDX-License-Identifier: MIT
// Author: kazuya kawaguchi (a.k.a. kazupon)

import { createUnplugin } from 'unplugin'
import { resolveOptions, parseRequestQuery } from './core/utils'
import { transformMain } from './core/transform'
import createDebug from 'debug'

import type { UnpluginFactory, UnpluginInstance } from 'unplugin'
import type { Options } from './types'

const debug = createDebug('unplugin-svelte-vapor')

export const unpluginFactory: UnpluginFactory<Options | undefined> = (options = {}, _meta) => {
  const resolvedOptions = resolveOptions(options)
  debug('... resolved options:', resolvedOptions)

  return {
    name: 'unplugin-svelte-vapor',

    resolveId(id, importer) {
      debug('Resolving ID ...', id, importer)
      const { filename, query } = parseRequestQuery(id)
      debug('resolveId ... parsed:', filename, query)
      if ('svelte' in query) {
        // TODO:
        return id
      }
    },

    load(id) {
      debug('Loading ...', id)

      const { filename, query } = parseRequestQuery(id)
      debug('load ... parsed:', filename, query)

      // TODO:
    },

    transformInclude(id) {
      debug('transformInclude params: id:', id)
      const { filename } = parseRequestQuery(id)
      return filename.endsWith('.svelte')
    },

    async transform(code, id) {
      const { filename, query } = parseRequestQuery(id)
      debug('transform parsed id:', filename, query, code)

      if (!('svelte' in query)) {
        return transformMain(this, code, filename, resolvedOptions, false, false)
      }
    },

    vite: {
      configResolved(config) {
        resolvedOptions.sourcemap = !!config.build.sourcemap
      },
      handleHotUpdate(ctx) {
        debug('Handling hot update ...', ctx)

        // TODO:
      }
    }

    // TODO:
    // welcome contribution :)
    // webpack: {}
  }
}

export const unplugin: UnpluginInstance<Options | undefined, boolean> =
  /* #__PURE__ */ createUnplugin(unpluginFactory)

export default unplugin
