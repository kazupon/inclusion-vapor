import { createRspackPlugin } from 'unplugin'
import { unpluginFactory } from '.'

import type { UnpluginInstance as _UnpluginInstance, RspackPluginInstance } from 'unplugin'
import type { Options as _Options } from './types'

// FIXME: type error ...
// const rspack: UnpluginInstance<Options | undefined, boolean> = createRspackPlugin(unpluginFactory)
const rspack: RspackPluginInstance = createRspackPlugin(unpluginFactory)

export default rspack
