import { IRNodeTypes, DynamicFlag } from '../ir'

import type { BlockIRNode, IRDynamicInfo } from '../ir'

export const newDynamic = (): IRDynamicInfo => ({
  flags: DynamicFlag.REFERENCED,
  children: []
})

export const newBlock = (node: BlockIRNode['node']): BlockIRNode => ({
  type: IRNodeTypes.BLOCK,
  node,
  dynamic: newDynamic(),
  effect: [],
  operation: [],
  returns: []
})
