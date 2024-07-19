// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-vapor`
// Author: Evan you (https://github.com/yyx990803) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-vapor/src/transforms/transformChildren.ts

import { IRNodeTypes, IRDynamicInfo, DynamicFlag, isSvelteText, SvelteElement } from '../ir'
import { transformNode } from '../transform'

import type { NodeTransform } from './types'
import type { TransformContext } from './context'

export const transformChildren: NodeTransform = (node, context) => {
  const isFragment =
    node.type === IRNodeTypes.ROOT || node.type === 'Fragment' || node.type === 'InlineComponent'
  if (node.type !== 'Element' && !isFragment) {
    return
  }

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
