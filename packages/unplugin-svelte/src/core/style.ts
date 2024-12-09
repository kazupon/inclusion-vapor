// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vitejs/vite-plugin-vue`
// Author: Evan you (https://github.com/yyx990803), Vite team and Vue community
// Repository url: https://github.com/vitejs/vite-plugin-vue

import createDebug from 'debug'
import { attrsToQuery } from './utils.ts'

import type { SvelteSFCDescriptor } from 'svelte-vapor-sfc-compiler'
import type { UnpluginContext } from './types.ts'

const debug = createDebug('unplugin-svelte-vapor:core:style')

export function genStyleCode(
  _context: UnpluginContext,
  descriptor: SvelteSFCDescriptor,
  customElement: boolean,
  attachedProps: [string, string][]
): string {
  debug('genStyleCode') //, context, descriptor, customElement, attachedProps)

  let stylesCode = ``
  // NOTE: we don't need for svelte, because it doesn't support css modules
  // let cssModulesMap: Record<string, string> | undefined

  if (descriptor.styles.length > 0) {
    for (let i = 0; i < descriptor.styles.length; i++) {
      const style = descriptor.styles[i]
      // NOTE: we don't need for svelte, because it doesn't support `src`
      // if (style.src) {
      //   await linkSrcToDescriptor(
      //     style.src,
      //     descriptor,
      //     pluginContext,
      //     style.scoped,
      //   )
      // }
      const src = style.src || descriptor.filename
      // do not include module in default query, since we use it to indicate
      // that the module needs to export the modules json
      const attrsQuery = attrsToQuery(style.attrs, 'css')
      const srcQuery = style.src ? (style.scoped ? `&src=${descriptor.id}` : '&src=true') : ''
      const directQuery = customElement ? `&inline` : ``
      const scopedQuery = style.scoped ? `&scoped=${descriptor.id}` : ``
      const query = `?svelte&type=style&index=${i}${srcQuery}${directQuery}${scopedQuery}`
      const styleRequest = src + query + attrsQuery
      if (style.module) {
        // NOTE: we don't need for svelte, because it doesn't support css modules
        // if (customElement) {
        //   throw new Error(
        //     `<style module> is not supported in custom elements mode.`,
        //   )
        // }
        // const [importCode, nameMap] = genCSSModulesCode(
        //   i,
        //   styleRequest,
        //   style.module,
        // )
        // stylesCode += importCode
        // Object.assign((cssModulesMap ||= {}), nameMap)
      } else {
        stylesCode += customElement
          ? `\nimport _style_${i} from ${JSON.stringify(styleRequest)}`
          : `\nimport ${JSON.stringify(styleRequest)}`
      }
      // TODO SSR critical CSS collection
    }

    if (customElement) {
      attachedProps.push([
        `styles`,
        `[${descriptor.styles.map((_, i) => `_style_${i}`).join(',')}]`
      ])
    }
  }

  // NOTE: we don't need for svelte, because it doesn't support css modules
  // if (cssModulesMap) {
  //   const mappingCode =
  //     Object.entries(cssModulesMap).reduce(
  //       (code, [key, value]) => code + `"${key}":${value},\n`,
  //       '{\n',
  //     ) + '}'
  //   stylesCode += `\nconst cssModules = ${mappingCode}`
  //   attachedProps.push([`__cssModules`, `cssModules`])
  // }

  return stylesCode
}
