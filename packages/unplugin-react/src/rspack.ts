import { createRspackPlugin } from 'unplugin'
import { unpluginFactory } from './index.ts'

import type { RspackPluginInstance } from 'unplugin'

// FIXME: type error ...
// const rspack: UnpluginInstance<Options | undefined, boolean> = createRspackPlugin(unpluginFactory)
const rspack: RspackPluginInstance = createRspackPlugin(unpluginFactory)

export default rspack
