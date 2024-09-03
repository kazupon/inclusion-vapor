import { createWebpackPlugin } from 'unplugin'
import { unpluginFactory } from './index.ts'

import type { UnpluginInstance } from 'unplugin'
import type { Options } from './types.ts'

const webpack: UnpluginInstance<Options | undefined, boolean>['webpack'] =
  createWebpackPlugin(unpluginFactory)
export default webpack
