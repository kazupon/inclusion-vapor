import { createUnplugin } from 'unplugin'

import type { UnpluginFactory, UnpluginInstance } from 'unplugin'
import type { Options } from './types'

export const unpluginFactory: UnpluginFactory<Options | undefined> = options => ({
  name: 'unplugin-starter',
  transformInclude(id) {
    return id.endsWith('main.ts')
  },
  transform(code) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    return code.replace('__UNPLUGIN__', `Hello Unplugin! ${options}`)
  }
})

export const unplugin: UnpluginInstance<Options | undefined, boolean> =
  /* #__PURE__ */ createUnplugin(unpluginFactory)

export default unplugin
