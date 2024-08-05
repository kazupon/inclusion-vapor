import { createUnplugin } from 'unplugin'
import { resolveOptions } from './core'
import createDebug from 'debug'

import type { UnpluginFactory, UnpluginInstance } from 'unplugin'
import type { Options } from './types'

const debug = createDebug('unplugin-svelte-vapor')

export const unpluginFactory: UnpluginFactory<Options | undefined> = (options = {}, _meta) => {
  debug('Resolving options ...', options)
  const resolvedOptions = resolveOptions(options)
  debug('... resolved options:', resolvedOptions)

  return {
    name: 'unplugin-svelte-vapor',

    resolveId(id, importer) {
      debug('Resolving ID ...', id, importer)

      // TODO:

      return id
    },

    load(id) {
      debug('Loading ...', id)

      // TODO:
    },

    transformInclude(id) {
      debug('Transforming include ...', id)

      // TODO:

      return id.endsWith('main.ts')
    },

    transform(code) {
      // TODO:
      return code.replace('__UNPLUGIN__', `Hello Unplugin!`)
    },

    vite: {
      handleHotUpdate(ctx) {
        debug('Handling hot update ...', ctx)

        // TODO:
      }
    }
  }
}

export const unplugin: UnpluginInstance<Options | undefined, boolean> =
  /* #__PURE__ */ createUnplugin(unpluginFactory)

export default unplugin
