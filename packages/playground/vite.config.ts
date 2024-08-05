import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import inspect from 'vite-plugin-inspect'
import * as CompilerSFC from '@vue/compiler-sfc'
import svelteVapor from 'unplugin-svelte-vapor/vite'

const dirname = path.dirname(fileURLToPath(new URL(import.meta.url)))
const resolve = (p: string) => path.resolve(dirname, './node_modules', p)

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      'vue/vapor': resolve('vue/vapor/index.mjs')
    }
  },
  plugins: [
    vue({
      vapor: true,
      compiler: CompilerSFC
    }),
    svelteVapor(),
    inspect()
  ]
})
