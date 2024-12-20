// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)

import { enableStructures, isSvelteElement, SvelteStylesheet } from 'svelte-vapor-template-compiler'
// NOTE: we need to import use exports path..., but vitest cannot handle it.
// import { SvelteStylesheet } from 'svelte-vapor-template-compiler/style'
import { generate as generateId, getShortId } from './id.ts'

import type { SvelteTemplateNode } from 'svelte-vapor-template-compiler'
import type {
  SvelteSFCAsyncStyleCompileOptions,
  SvelteSFCStyleCompileOptions,
  SvelteSFCStyleCompileResults
} from './types.ts'

export function compileStyle(options: SvelteSFCStyleCompileOptions): SvelteSFCStyleCompileResults {
  return doCompileStyle({
    ...options,
    isAsync: false
  }) as SvelteSFCStyleCompileResults
}

export function compileStyleAsync(
  options: SvelteSFCAsyncStyleCompileOptions
): Promise<SvelteSFCStyleCompileResults> {
  return doCompileStyle({
    ...options,
    isAsync: true
  }) as Promise<SvelteSFCStyleCompileResults>
}
export function doCompileStyle(
  options: SvelteSFCAsyncStyleCompileOptions
): SvelteSFCStyleCompileResults | Promise<SvelteSFCStyleCompileResults> {
  const { id, templateAst, ast, isProd, filename, sourceAll } = options

  const shortId = getShortId(id)
  const longId = generateId(shortId)

  enableStructures(templateAst)

  const stylesheet = new SvelteStylesheet({
    ast,
    source: sourceAll,
    dev: !isProd,
    filename,
    cssHash: longId
  })

  walk(templateAst, {
    enter(node) {
      if (isSvelteElement(node)) {
        stylesheet.apply(node)
      }
    }
  })
  stylesheet.reify()

  const { code, map } = stylesheet.render(filename)

  return {
    code,
    map,
    errors: []
  } as unknown as SvelteSFCStyleCompileResults
}

function walk(
  node: SvelteTemplateNode,
  {
    enter,
    leave
  }: { enter?: (node: SvelteTemplateNode) => void; leave?: (node: SvelteTemplateNode) => void }
) {
  enter?.(node)
  if (node.children) {
    for (const child of node.children) {
      walk(child, { enter, leave })
    }
  }
  leave?.(node)
}
