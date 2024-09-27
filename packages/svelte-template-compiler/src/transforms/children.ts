// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-vapor`
// Author: Evan you (https://github.com/yyx990803) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-vapor/src/transforms/transformChildren.ts

import { DynamicFlag, IRNodeTypes, isSvelteText } from '../ir/index.ts'
import { transformNode } from '../transform.ts'

import type { IRDynamicInfo, SvelteElement } from '../ir/index.ts'
import type { TransformContext } from './context.ts'
import type { NodeTransform } from './types.ts'

export const transformChildren: NodeTransform = (node, context) => {
  const isFragment =
    node.type === IRNodeTypes.ROOT ||
    node.type === 'Fragment' ||
    node.type === 'InlineComponent' ||
    node.type === 'Slot'
  if (node.type !== 'Element' && !isFragment) {
    return
  }
  processChildren(node, context, isFragment)
}

export function processChildren(
  node: Parameters<NodeTransform>[0],
  context: Parameters<NodeTransform>[1],
  isFragment: boolean
): ReturnType<NodeTransform> {
  const children = node.children || []

  // normalize svelte text
  for (const [index, child] of [...children].entries()) {
    if (isSvelteText(child) && !child.data.trim()) {
      child.data = ' '
      if (!index) {
        children.splice(0, 1)
      } else if (index === children.length) {
        children.splice(-1, 1)
      }
    }
  }

  for (const [i, child] of children.entries()) {
    const childContext = context.create(child, i)
    transformNode(childContext)

    if (isFragment) {
      childContext.reference()
      childContext.registerTemplate()

      if (
        !(childContext.dynamic.flags & DynamicFlag.NON_TEMPLATE) ||
        childContext.dynamic.flags & DynamicFlag.INSERT
      ) {
        context.block.returns.push(childContext.dynamic.id!)
      }
    } else {
      context.childrenTemplate.push(childContext.template)
    }

    context.dynamic.children[i] = childContext.dynamic
  }

  if (!isFragment) {
    processDynamicChildren(context as TransformContext<SvelteElement>)
  }
}

function processDynamicChildren(context: TransformContext<SvelteElement>) {
  let prevDynamics: IRDynamicInfo[] = []
  let hasStaticTemplate = false
  const children = context.dynamic.children

  for (const [index, child] of children.entries()) {
    if (child.flags & DynamicFlag.INSERT) {
      prevDynamics.push(child)
    }

    if (!(child.flags & DynamicFlag.NON_TEMPLATE)) {
      if (prevDynamics.length > 0) {
        if (hasStaticTemplate) {
          context.childrenTemplate[index - prevDynamics.length] = `<!>`

          prevDynamics[0].flags -= DynamicFlag.NON_TEMPLATE
          const anchor = (prevDynamics[0].anchor = context.increaseId())

          context.registerOperation({
            type: IRNodeTypes.INSERT_NODE,
            elements: prevDynamics.map(child => child.id!),
            parent: context.reference(),
            anchor
          })
        } else {
          context.registerOperation({
            type: IRNodeTypes.PREPEND_NODE,
            elements: prevDynamics.map(child => child.id!),
            parent: context.reference()
          })
        }
        prevDynamics = []
      }
      hasStaticTemplate = true
    }
  }

  if (prevDynamics.length > 0) {
    context.registerOperation({
      type: IRNodeTypes.INSERT_NODE,
      elements: prevDynamics.map(child => child.id!),
      parent: context.reference()
    })
  }
}
