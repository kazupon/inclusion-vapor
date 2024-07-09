import { defineConfig, javascript, comments, typescript, regexp } from '@kazupon/eslint-config'

export default defineConfig(javascript(), comments(), regexp(), typescript(), {
  name: 'ignores',
  ignores: ['**/dist/*']
})
