import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/store.ts',
    'src/action.ts',
    'src/animate.ts',
    'src/easing.ts',
    'src/motion.ts',
    'src/transition.ts'
  ],
  format: ['esm', 'cjs'],
  platform: 'node',
  outDir: 'dist',
  clean: true,
  unused: true,
  dts: true
})
