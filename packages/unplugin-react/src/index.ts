// SPDX-License-Identifier: MIT
// Author: kazuya kawaguchi (a.k.a. kazupon)

import { createUnplugin } from 'unplugin'
import createDebug from 'debug'
import * as babelCore from '@babel/core'
import { resolveOptions } from './core/utils'
// import { transformMain } from './core/transform'
import {
  addClassComponentRefreshWrapper,
  addRefreshWrapper,
  runtimePublicPath,
  runtimeCode,
  preambleCode
} from './core/fastRefresh'
// import { EXPORT_HELPER_ID, helperCode } from './core/helper'

import type { UnpluginFactory, UnpluginInstance, UnpluginOptions } from 'unplugin'
import type {
  Options,
  BabelOptions,
  ReactBabelOptions,
  ReactBabelHook,
  ViteReactPluginApi
} from './types'
import type { PluginItem } from '@babel/core'

const debug = createDebug('unplugin-react-vapor')

const RE_REACT_COMP = /extends\s+(?:React\.)?(?:Pure)?Component/
const RE_REFRESH_CONTENT = /\$Refresh(?:Reg|Sig)\$\(/
const RE_TS = /\.tsx?$/

// Support patterns like:
// - import * as React from 'react';
// - import React from 'react';
// - import React, {useEffect} from 'react';
const RE_IMPORT_REACT = /\bimport\s+(?:\*\s+as\s+)?React\b/

export const unpluginFactory: UnpluginFactory<Options | undefined, true> = (
  options = {},
  _meta
) => {
  const resolvedOptions = resolveOptions(options)
  debug('... resolved options:', resolvedOptions)

  const babel: UnpluginOptions = {
    name: 'unplugin-svelte-vapor:babel',
    enforce: 'pre',

    vite: {
      config() {
        return resolvedOptions.jsxRuntime === 'classic'
          ? {
              esbuild: {
                jsx: 'transform'
              }
            }
          : {
              esbuild: {
                jsx: 'automatic',
                jsxImportSource: resolvedOptions.jsxImportSource
              },
              optimizeDeps: { esbuildOptions: { jsx: 'automatic' } }
            }
      },

      configResolved(config) {
        resolvedOptions.devBase = config.base
        resolvedOptions.isProduction = config.isProduction
        resolvedOptions.root = config.root
        resolvedOptions.skipFastRefresh =
          resolvedOptions.isProduction || config.command === 'build' || config.server.hmr === false

        if ('jsxPure' in resolvedOptions) {
          config.logger.warnOnce(
            '[unplugin-react-vapor:babel] jsxPure was removed. You can configure esbuild.jsxSideEffects directly.'
          )
        }

        const hooks: ReactBabelHook[] = config.plugins
          .map(plugin => (plugin.api as ViteReactPluginApi)?.reactBabel)
          .filter(defined) // eslint-disable-line unicorn/no-array-callback-reference

        if (hooks.length > 0) {
          resolvedOptions.runPluginOverrides = (babelOptions, context) => {
            hooks.forEach(hook => hook(babelOptions, context, config))
          }
        } else if (typeof resolvedOptions.babel !== 'function') {
          // Because hooks and the callback option can mutate the Babel options
          // we only create static option in this case and re-create them
          // each time otherwise
          resolvedOptions.staticBabelOptions = createBabelOptions(resolvedOptions.babel)
        }
      },
      handleHotUpdate(ctx) {
        debug('Handling hot update ...', ctx)
        // TODO:
      }
    },

    // TODO:
    // welcome contribution :)
    // webpack: {}

    // resolveId(id, importer) {
    //   debug('resolving id ...', id, importer)
    //   // component export helper
    //   if (id === EXPORT_HELPER_ID) {
    //     return id
    //   }

    //   return id
    // },

    // load(id) {
    //   debug('load params', id)

    //   if (id === EXPORT_HELPER_ID) {
    //     return helperCode
    //   }
    // },

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

    async transform(code, id) {
      debug('transform params:', code, id)

      const ssr = false // opts?.ssr === true
      const babelOptions = (() => {
        if (resolvedOptions.staticBabelOptions) {
          return resolvedOptions.staticBabelOptions
        }
        const newBabelOptions = createBabelOptions(
          typeof resolvedOptions.babel === 'function'
            ? resolvedOptions.babel(id, { ssr })
            : resolvedOptions.babel
        )
        resolvedOptions.runPluginOverrides?.(newBabelOptions, { id, ssr })
        return newBabelOptions
      })()

      const plugins = [...babelOptions.plugins]

      const [filepath] = id.split('?')
      const isJSX = filepath.endsWith('x')
      const useFastRefresh =
        !resolvedOptions.skipFastRefresh &&
        !ssr &&
        (isJSX ||
          (resolvedOptions.jsxRuntime === 'classic'
            ? RE_IMPORT_REACT.test(code)
            : code.includes(resolvedOptions.jsxImportDevRuntime) ||
              code.includes(resolvedOptions.jsxImportRuntime)))
      if (useFastRefresh) {
        plugins.push([await loadPlugin('react-refresh/babel'), { skipEnvCheck: true }])
      }

      if (resolvedOptions.jsxRuntime === 'classic' && isJSX && !resolvedOptions.isProduction) {
        // These development plugins are only needed for the classic runtime.
        plugins.push(
          await loadPlugin('@babel/plugin-transform-react-jsx-self'),
          await loadPlugin('@babel/plugin-transform-react-jsx-source')
        )
      }

      // Avoid parsing if no special transformation is needed
      if (
        plugins.length === 0 &&
        babelOptions.presets.length === 0 &&
        !babelOptions.configFile &&
        !babelOptions.babelrc
      ) {
        return
      }

      const parserPlugins = [...babelOptions.parserOpts.plugins]

      if (!filepath.endsWith('.ts')) {
        parserPlugins.push('jsx')
      }
      if (RE_TS.test(filepath)) {
        parserPlugins.push('typescript')
      }

      const babel = await loadBabel()
      const result = await babel.transformAsync(code, {
        ...babelOptions,
        root: resolvedOptions.root,
        filename: id,
        sourceFileName: filepath,
        // Required for esbuild.jsxDev to provide correct line numbers
        // This crates issues the react compiler because the re-order is too important
        // People should use @babel/plugin-transform-react-jsx-development to get back good line numbers
        retainLines: hasCompiler(plugins)
          ? false
          : !resolvedOptions.isProduction && isJSX && resolvedOptions.jsxRuntime !== 'classic',
        parserOpts: {
          ...babelOptions.parserOpts,
          sourceType: 'module',
          allowAwaitOutsideFunction: true,
          plugins: parserPlugins
        },
        generatorOpts: {
          ...babelOptions.generatorOpts,
          decoratorsBeforeExport: true
        },
        plugins,
        sourceMaps: true
      })

      if (result) {
        debug('transform result:', result.code)
        let code = result.code!
        if (useFastRefresh) {
          if (RE_REFRESH_CONTENT.test(code)) {
            code = addRefreshWrapper(code, id)
          } else if (RE_REACT_COMP.test(code)) {
            code = addClassComponentRefreshWrapper(code, id)
          }
        }
        return { code, map: result.map }
      }
    }
  }

  // We can't add `react-dom` because the dependency is `react-dom/client`
  // for React 18 while it's `react-dom` for React 17. We'd need to detect
  // what React version the user has installed.
  const dependencies = [
    'react',
    resolvedOptions.jsxImportDevRuntime,
    resolvedOptions.jsxImportRuntime
  ]
  const staticBabelPlugins =
    typeof resolvedOptions.babel === 'object' ? (resolvedOptions.babel?.plugins ?? []) : []
  if (hasCompilerWithDefaultRuntime(staticBabelPlugins)) {
    dependencies.push('react/compiler-runtime')
  }

  const debugRefresh = createDebug('unplugin-react-vapor:refresh')

  const refresh: UnpluginOptions = {
    name: 'unplugin-svelte-vapor:refresh',
    enforce: 'pre',

    vite: {
      config(userConfig) {
        return {
          build: silenceUseClientWarning(userConfig), // eslint-disable-line @typescript-eslint/no-unsafe-assignment
          optimizeDeps: {
            include: dependencies
          },
          resolve: {
            dedupe: ['react', 'react-dom']
          }
        }
      },
      transformIndexHtml() {
        if (!resolvedOptions.skipFastRefresh)
          return [
            {
              tag: 'script',
              attrs: { type: 'module' },
              children: preambleCode.replace(`__BASE__`, resolvedOptions.devBase)
            }
          ]
      }
    },

    // TODO:
    // welcome contribution :)
    // webpack: {}

    resolveId(id, importer) {
      if (id === runtimePublicPath) {
        debugRefresh('resolvedId', id, importer)
        return id
      }
    },

    load(id) {
      if (id === runtimePublicPath) {
        debugRefresh('load', id, runtimeCode)
        return runtimeCode
      }
    }
  }
  // @ts-expect-error -- IGNORE
  refresh.preambleCode = preambleCode

  // return [babel, refresh]
  return [babel, refresh]
}

// lazy load babel since it's not used during build if plugins are not used
let babel: typeof babelCore | undefined
async function loadBabel() {
  if (!babel) {
    babel = await import('@babel/core')
  }
  return babel
}

type Awaitable<T> = T | Promise<T>

const loadedPlugin = new Map<string, Awaitable<PluginItem>>()
function loadPlugin(path: string): Awaitable<PluginItem> {
  const cached = loadedPlugin.get(path)
  if (cached) {
    return cached
  }

  const promise = import(path).then((mod: PluginItem | { default: PluginItem }) => {
    const value = (mod as { default: PluginItem }).default || mod
    loadedPlugin.set(path, value)
    return value
  })

  loadedPlugin.set(path, promise)
  return promise
}

function createBabelOptions(rawOptions?: BabelOptions) {
  const babelOptions = {
    babelrc: false,
    configFile: false,
    ...rawOptions
  } as ReactBabelOptions

  babelOptions.plugins ||= []
  babelOptions.presets ||= []
  babelOptions.overrides ||= []
  babelOptions.parserOpts ||= {} as ReactBabelOptions['parserOpts']
  babelOptions.parserOpts.plugins ||= []

  return babelOptions
}

function defined<T>(value: T | undefined): value is T {
  return value !== undefined
}

function hasCompiler(plugins: ReactBabelOptions['plugins']) {
  return plugins.some(
    p =>
      p === 'babel-plugin-react-compiler' ||
      (Array.isArray(p) && p[0] === 'babel-plugin-react-compiler')
  )
}

// https://gist.github.com/poteto/37c076bf112a07ba39d0e5f0645fec43
function hasCompilerWithDefaultRuntime(plugins: ReactBabelOptions['plugins']) {
  return plugins.some(
    p =>
      p === 'babel-plugin-react-compiler' ||
      (Array.isArray(p) &&
        p[0] === 'babel-plugin-react-compiler' &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        p[1]?.runtimeModule === undefined)
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- NOET: to tree-shaking, not use types that is provided by vite
const silenceUseClientWarning = (userConfig: /*UserConfig*/ any): any /*BuildOptions*/ => ({
  rollupOptions: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-function-type -- NOET: to tree-shaking, not use types that is provided by vite
    onwarn(warning: any, defaultHandler: Function) {
      if (
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        warning.message.includes('use client')
      ) {
        return
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (userConfig.build?.rollupOptions?.onwarn) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        userConfig.build.rollupOptions.onwarn(warning, defaultHandler)
      } else {
        defaultHandler(warning)
      }
    }
  }
})

export const unplugin: UnpluginInstance<Options | undefined, boolean> =
  /* #__PURE__ */ createUnplugin(unpluginFactory)

export default unplugin
