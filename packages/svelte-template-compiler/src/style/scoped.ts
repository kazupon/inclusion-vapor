// SPDX-License-Identifier: MIT
// Author: kazuya kawaguchi (a.k.a. kazupon)

import { SvelteStylesheet } from './stylesheet.ts'
import type { ScopedStyleApplyer } from './types.ts'

export const scopedStyleApplyer: ScopedStyleApplyer = (_node, context): void => {
  if (context.options.css) {
    const stylesheet = new SvelteStylesheet(context.options.css)
    console.log('applyScopedStyle', stylesheet)
  }
}
