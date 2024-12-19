import { defineConfig } from 'tsdown'

// TODO:
// near the future, we will more teawks to make it more flexible building, we need to provide some dist files, such as browser, node, etc.
// we will configure for flag (`__DEV__`, `__BROWSER__`, etc.) to make it more flexible building.

export default defineConfig({
  entry: ['src/index.ts', 'src/style/index.ts'],
  format: ['esm', 'cjs'],
  platform: 'node',
  outDir: 'dist',
  clean: true,
  dts: true,
  define: {
    __BROWSER__: 'false',
    __DEV__: 'false'
  }
})
