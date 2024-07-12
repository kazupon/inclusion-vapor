import { IRNodeTypes, DynamicFlag } from '../ir'
import { transformNode } from '../transform'

import type { NodeTransform } from './types'

export const transformChildren: NodeTransform = (node, context) => {
  const isFragment =
    node.type === IRNodeTypes.ROOT || node.type === 'Fragment' || node.type === 'InlineComponent'
  if (!isFragment) {
    return
  }

  const children = node.children || []
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
}
