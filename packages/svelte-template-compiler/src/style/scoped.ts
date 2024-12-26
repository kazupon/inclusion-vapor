// SPDX-License-Identifier: MIT
// Author: kazuya kawaguchi (a.k.a. kazupon)

import { SvelteStylesheet } from './stylesheet.ts'

import type { ScopedCssApplyer } from '../compile.ts'
import type { SvelteStylesheetOptions } from './stylesheet.ts'

export function createScopedCssApplyer(options: SvelteStylesheetOptions): ScopedCssApplyer {
  const stylesheet = new SvelteStylesheet(options)
  return node => {
    stylesheet.apply(node, true)
  }
}
