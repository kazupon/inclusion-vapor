// SPDX-License-Identifier: MIT
// Author: kazuya kawaguchi (a.k.a. kazupon)

import { createUnplugin } from 'unplugin'
import createDebug from 'debug'
import { resolveOptions } from './core/utils'
// import { transformMain } from './core/transform'
import { EXPORT_HELPER_ID, helperCode } from './core/helper'

import type { UnpluginFactory, UnpluginInstance } from 'unplugin'
import type { Options } from './types'

const debug = createDebug('unplugin-react-vapor')

export const unpluginFactory: UnpluginFactory<Options | undefined> = (options = {}, _meta) => {
  const resolvedOptions = resolveOptions(options)
  debug('... resolved options:', resolvedOptions)

  return {
    name: 'unplugin-svelte-vapor',

    resolveId(id, importer) {
      debug('resolving id ...', id, importer)
      // component export helper
      if (id === EXPORT_HELPER_ID) {
        return id
      }

      return id
    },

    load(id) {
      debug('load params', id)

      if (id === EXPORT_HELPER_ID) {
        return helperCode
      }
    },

    transformInclude(id) {
      debug('transformInclude params: id:', id)
      return id.endsWith('.tsx') || id.endsWith('.jsx')
    },

    transform(code, id) {
      debug('transform params:', code, id)

      return {
        code
      }
    },

    vite: {
      configResolved(config) {
        resolvedOptions.sourcemap = !!config.build.sourcemap
        resolvedOptions.isProduction = config.isProduction
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
