// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vitejs/plugin-react`
// Author: Evan you (https://github.com/yyx990803), Vite team and Vite community
// Repository url: https://github.com/vitejs/vite-plugin-react

import type { ParserOptions, TransformOptions } from '@babel/core'

export type BabelOptions = Omit<
  TransformOptions,
  'ast' | 'filename' | 'root' | 'sourceFileName' | 'sourceMaps' | 'inputSourceMap'
>

export interface Options {
  include?: string | RegExp | (string | RegExp)[]
  exclude?: string | RegExp | (string | RegExp)[]
  /**
   * Control where the JSX factory is imported from.
   * https://esbuild.github.io/api/#jsx-import-source
   * @default 'react'
   */
  jsxImportSource?: string
  /**
   * NOTE: Skipping React import with classic runtime is not supported
   * @default "automatic"
   */
  jsxRuntime?: 'classic' | 'automatic'
  /**
   * Babel configuration applied in both dev and prod.
   */
  babel?: BabelOptions | ((id: string, options: { ssr?: boolean }) => BabelOptions)
}

/**
 * The object type used by the `options` passed to plugins with
 * an `api.reactBabel` method.
 */
export interface ReactBabelOptions extends BabelOptions {
  plugins: Extract<BabelOptions['plugins'], unknown[]>
  presets: Extract<BabelOptions['presets'], unknown[]>
  overrides: Extract<BabelOptions['overrides'], unknown[]>
  parserOpts: ParserOptions & {
    plugins: Extract<ParserOptions['plugins'], unknown[]>
  }
}

export type ReactBabelHook = (
  babelConfig: ReactBabelOptions,
  context: ReactBabelHookContext,
  config: unknown
) => void

export type ReactBabelHookContext = { ssr: boolean; id: string }

export type ViteReactPluginApi = {
  /**
   * Manipulate the Babel options
   */
  reactBabel?: ReactBabelHook
}
