import { createVitePlugin } from 'unplugin'
import { unpluginFactory } from '.'

import type { UnpluginInstance } from 'unplugin'
import type { Options } from './types'

const vite: UnpluginInstance<Options | undefined, boolean>['vite'] =
  createVitePlugin(unpluginFactory)

export default vite
