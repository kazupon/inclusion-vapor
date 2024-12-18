// SPDX-License-Identifier: MIT
// Author: kazuya kawaguchi (a.k.a. kazupon)

import type { SvelteTemplateNode } from '../ir/index.ts'
import type { TransformContext } from '../transforms/index.ts'

export type ScopedStyleApplyer = (
  node: SvelteTemplateNode,
  context: TransformContext<SvelteTemplateNode>
) => void
