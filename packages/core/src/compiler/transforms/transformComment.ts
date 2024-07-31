// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-vapor`
// Author: Evan you (https://github.com/yyx990803) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-vapor/src/transforms/transformComment.ts

import { DynamicFlag, isSvelteComment, isSvelteText } from '../ir'

import type { TransformContext } from './context'
import type { NodeTransform } from './types'
import type { SvelteComment, SvelteTemplateNode } from '../ir'

export const transformComment: NodeTransform = (node, context) => {
  if (!isSvelteComment(node)) {
    return
  }

  if (getSiblingIf(context as TransformContext<SvelteComment>)) {
    context.comment.push(node)
    context.dynamic.flags != DynamicFlag.NON_TEMPLATE
  } else {
    context.template += `<!--${node.data}-->`
  }
}

export function getSiblingIf(
  context: TransformContext<SvelteComment>,
  reverse?: boolean
): SvelteTemplateNode | undefined {
  const parent = context.parent
  if (!parent) {
    return
  }

  const siblings = parent.node.children || []
  let sibling: SvelteTemplateNode | undefined
  let i = siblings.indexOf(context.node)
  while (reverse ? --i >= 0 : ++i < siblings.length) {
    sibling = siblings[i]
    if (!isCommentLike(sibling)) {
      break
    }
  }

  // TODO: should implement for if / else-if / else blocks

  return sibling
}

function isCommentLike(node: SvelteTemplateNode): boolean {
  return isSvelteComment(node) || (isSvelteText(node) && node.data.trim().length === 0)
}
