import { createRollupPlugin } from 'unplugin'
import { unpluginFactory } from '.'

import type { UnpluginInstance } from 'unplugin'
import type { Options } from './types.ts'

const rollup: UnpluginInstance<Options | undefined, boolean>['rollup'] =
  createRollupPlugin(unpluginFactory)

export default rollup
