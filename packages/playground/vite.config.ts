import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import reactVapor from 'unplugin-react-vapor/vite'
import svelteVapor from 'unplugin-svelte-vapor/vite'
import { defineConfig } from 'vite'
import devtools from 'vite-plugin-vue-devtools'

const dirname = path.dirname(fileURLToPath(new URL(import.meta.url)))
const resolve = (p: string) => path.resolve(dirname, './node_modules', p)

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@vue/vapor': resolve('@vue/vapor/dist/vue-vapor.esm-bundler.js'),
      '@vue/runtime-vapor': resolve('@vue/runtime-vapor/dist/runtime-vapor.esm-bundler.js'),
      'vue/vapor': resolve('vue/vapor/index.mjs')
    }
  },
  plugins: [vue(), svelteVapor(), reactVapor(), devtools()]
})
