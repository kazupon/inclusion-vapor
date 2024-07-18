import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import inspect from 'vite-plugin-inspect'
import * as CompilerSFC from '@vue/compiler-sfc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      compiler: CompilerSFC
    }),
    inspect()
  ]
})
