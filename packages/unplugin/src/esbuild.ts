import { createEsbuildPlugin } from 'unplugin'
import { unpluginFactory } from '.'

import type { UnpluginInstance } from 'unplugin'
import type { Options } from './types'

const esbuild: UnpluginInstance<Options | undefined, boolean>['esbuild'] =
  createEsbuildPlugin(unpluginFactory)

export default esbuild
