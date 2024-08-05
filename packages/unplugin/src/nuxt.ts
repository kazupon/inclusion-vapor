import { addVitePlugin, addWebpackPlugin, defineNuxtModule } from '@nuxt/kit'
import vite from './vite'
import webpack from './webpack'
import '@nuxt/schema'

import type { Options } from './types'

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
