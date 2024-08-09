import { defineConfig } from 'tsdown'
import replace from '@rollup/plugin-replace'

export default defineConfig({
  entry: 'src/index.ts',
  format: ['esm', 'cjs'],
  platform: 'node',
  outDir: 'dist',
  clean: true,
  dts: true,
  // @ts-expect-error
  plugins: [
    replace({
      // TODO: near the future, we will more teawks to make it more flexible building, we need to provide some dist files, such as browser, node, etc.
      __BROWSER__: 'false'
    })
  ]
})
