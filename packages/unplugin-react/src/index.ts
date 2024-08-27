// SPDX-License-Identifier: MIT
// Author: kazuya kawaguchi (a.k.a. kazupon)

import { createUnplugin } from 'unplugin'
import createDebug from 'debug'
import { resolveOptions } from './core/utils.ts'
import { transformComponent, transformReactivity } from './core/transform.ts'

import type { UnpluginFactory, UnpluginInstance, UnpluginOptions } from 'unplugin'
import type { Options } from './types.ts'

const debug = createDebug('unplugin-react-vapor')

const RE_IMPORT_REACT = /from\s+["']react["']/

export const unpluginFactory: UnpluginFactory<Options | undefined, true> = (
  options = {},
  _meta
) => {
  const resolvedOptions = resolveOptions(options)
  debug('... resolved options:', resolvedOptions)

  const component: UnpluginOptions = {
    name: 'unplugin-react-vapor-component',
    enforce: 'pre',

    vite: {
      configResolved(config) {
        resolvedOptions.devBase = config.base
        resolvedOptions.isProduction = config.isProduction
        resolvedOptions.root = config.root
      },
      handleHotUpdate(ctx) {
        debug('Handling hot update ...', ctx)
        // TODO:
      }
    },

    // TODO:
    // welcome contribution :)
    // webpack: {}

    transformInclude(id) {
      debug('transformInclude params: id:', id)

      if (id.includes('/node_modules/')) {
        return false
      }

      const [filepath] = id.split('?')
      // eslint-disable-next-line unicorn/no-array-callback-reference
      if (!resolvedOptions.filter(filepath)) {
        return false
      }

      return true
    },

    transform(code, id) {
      debug('transform params:', code, id)

      // const _ssr = false // opts?.ssr === true
      const [filepath] = id.split('?')

      if (!RE_IMPORT_REACT.test(code)) {
        return
      }

      const result = transformComponent(code, filepath, resolvedOptions)
      debug('transformComponent result:', result)

      return result
    }
  }

  const reactivity: UnpluginOptions = {
    name: 'unplugin-react-vapor-reactivity',
    enforce: 'pre',

    transformInclude(id) {
      if (id.includes('/node_modules/')) {
        return false
      }

      const [filepath] = id.split('?')
      // eslint-disable-next-line unicorn/no-array-callback-reference
      if (!resolvedOptions.filter(filepath)) {
        return false
      }

      return true
    },

    transform(code, id) {
      debug('transformReactivity params:', code, id)

      // const _ssr = false // opts?.ssr === true
      const [filepath] = id.split('?')
      const result = transformReactivity(code, filepath, resolvedOptions)
      debug('transformReactivity result:', result)

      return result
    }
  }

  return [component, reactivity]
}

export const unplugin: UnpluginInstance<Options | undefined, boolean> =
  /* #__PURE__ */ createUnplugin(unpluginFactory)

export default unplugin
