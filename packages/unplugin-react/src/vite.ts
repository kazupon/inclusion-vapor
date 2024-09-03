import { createVitePlugin } from 'unplugin'
import { unpluginFactory } from './index.ts'

import type { UnpluginInstance } from 'unplugin'
import type { Options } from './types.ts'

const vite: UnpluginInstance<Options | undefined, boolean>['vite'] =
  createVitePlugin(unpluginFactory)

export default vite
