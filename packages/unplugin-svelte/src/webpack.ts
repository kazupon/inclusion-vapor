import { createWebpackPlugin } from 'unplugin'
import { unpluginFactory } from '.'

import type { UnpluginInstance } from 'unplugin'
import type { Options } from './types'

const webpack: UnpluginInstance<Options | undefined, boolean>['webpack'] =
  createWebpackPlugin(unpluginFactory)
export default webpack
