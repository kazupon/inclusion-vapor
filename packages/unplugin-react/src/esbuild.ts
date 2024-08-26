import { createEsbuildPlugin } from 'unplugin'
import { unpluginFactory } from '.'

import type { UnpluginInstance } from 'unplugin'
import type { Options } from './types.ts'

const esbuild: UnpluginInstance<Options, boolean>['esbuild'] = createEsbuildPlugin(unpluginFactory)

export default esbuild
