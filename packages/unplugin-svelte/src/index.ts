// SPDX-License-Identifier: MIT
// Author: kazuya kawaguchi (a.k.a. kazupon)

import createDebug from 'debug'
import { createUnplugin } from 'unplugin'
import { getDescriptor } from './core/descriptor.ts'
import { EXPORT_HELPER_ID, helperCode } from './core/helper.ts'
import { getResolvedScript } from './core/script.ts'
import { transformMain } from './core/transform.ts'
import { parseRequestQuery, resolveOptions } from './core/utils.ts'

import type { SvelteSFCBlock } from 'svelte-vapor-sfc-compiler'
import type { UnpluginFactory, UnpluginInstance } from 'unplugin'
import type { Options } from './types.ts'

const debug = createDebug('unplugin-svelte-vapor')

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

      // serve sub-part requests (*?svelte) as virtual modules
      const { query } = parseRequestQuery(id)
      if ('svelte' in query) {
        return id
      }
    },

    load(id) {
      debug('load params', id)

      if (id === EXPORT_HELPER_ID) {
        return helperCode
      }

      const ssr = false // opts?.ssr === true
      const { filename, query } = parseRequestQuery(id)
      debug('load id parsed', filename, query)

      if ('svelte' in query) {
        // TODO: 'src' in query
        // if (query.src) {
        //   return fs.readFileSync(filename, 'utf-8')
        // }

        const descriptor = getDescriptor(filename, resolvedOptions)!
        let block: SvelteSFCBlock | null | undefined
        switch (query.type) {
          case 'script': {
            // handle svelte <script> merge via compileScript()
            block = getResolvedScript(descriptor, ssr)
            break
          }
          case 'template': {
            block = descriptor.template!
            break
          }
          case 'style': {
            const index = Number.parseInt(query.index)
            block = descriptor.styles[index]
            break
          }
          default: {
            debug('unknown block type:', query.type)
            break
          }
        }

        debug(`block '${query.type}' with sub query`, block)
        if (block) {
          return {
            code: block.content,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment -- FIXME
            map: block.map as any
          }
        }
      }
    },

    transformInclude(id) {
      debug('transformInclude params: id:', id)
      const { filename } = parseRequestQuery(id)
      return filename.endsWith('.svelte')
    },

    async transform(code, id) {
      debug('transform params:', code, id)

      const ssr = false // opts?.ssr === true
      const { filename, query } = parseRequestQuery(id)
      debug('transform parsed id:', filename, query)

      // eslint-disable-next-line unicorn/no-negated-condition
      if (!('svelte' in query)) {
        return transformMain(this, code, filename, resolvedOptions, ssr, false)
      } else {
        // sub block request
        if (query.type === 'template') {
          // TODO:
        } else if (query.type === 'style') {
          // TODO:
        }
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
