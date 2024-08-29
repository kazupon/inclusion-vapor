import { defineConfig } from 'vitest/config'
import { entries } from './scripts/aliases.ts'

export default defineConfig({
  define: {
    __BROWSER__: false,
    __TEST__: true
  },
  resolve: {
    alias: entries
  }
})
