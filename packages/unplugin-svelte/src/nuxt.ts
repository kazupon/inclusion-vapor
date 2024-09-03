import { addVitePlugin, addWebpackPlugin, defineNuxtModule } from '@nuxt/kit'
import '@nuxt/schema'
import vite from './vite.ts'
import webpack from './webpack.ts'

import type { Options } from './types.ts'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ModuleOptions extends Options {}

const nuxt: ReturnType<typeof defineNuxtModule> = defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-unplugin-svelte-vapor',
    configKey: 'unpluginSvelteVapor'
  },
  defaults: {
    // ...default options
  },
  setup(options, _nuxt) {
    addVitePlugin(() => vite(options))
    addWebpackPlugin(() => webpack(options))

    // ...
  }
})

export default nuxt
