import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/compiler.ts', 'src/scope.ts'],
  format: ['esm', 'cjs'],
  platform: 'node',
  outDir: 'dist',
  clean: true,
  unused: true,
  dts: true,
  define: {
    __BROWSER__: 'false'
  }
})
