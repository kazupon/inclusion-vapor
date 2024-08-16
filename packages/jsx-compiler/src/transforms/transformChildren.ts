// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `unplugin-vue-jsx-vapor`
// Author: zhiyuanzmj (https://github.com/zhiyuanzmj) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/unplugin/unplugin-vue-jsx-vapor
// Code url: https://github.com/unplugin/unplugin-vue-jsx-vapor/tree/main/src/core/compiler

import { isComponentNode } from './utils'
import { IRNodeTypes, DynamicFlag } from '../ir'
import { transformNode } from '../transform'

import type { BabelNode, IRDynamicInfo } from '../ir'
import type { NodeTransform } from './types'
import type { TransformContext } from './context'

export const transformChildren: NodeTransform = (node, context) => {
  const isFragment =
    node.type === IRNodeTypes.ROOT || node.type === 'JSXFragment' || isComponentNode(node)

  if (node.type !== 'JSXElement' && !isFragment) {
    return
  }

  ;[...node.children].forEach((child, index) => {
    if (child.type === 'JSXText' && !child.value.trim()) {
      child.value = ' '
      if (!index) {
        node.children.splice(0, 1)
      } else if (index === node.children.length) {
        node.children.splice(-1, 1)
      }
    }
  })

  for (const [i, child] of node.children.entries()) {
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
    processDynamicChildren(context as TransformContext<BabelNode>)
  }
}

function processDynamicChildren(context: TransformContext<BabelNode>) {
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
