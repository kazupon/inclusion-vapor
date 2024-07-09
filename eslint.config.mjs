import { defineConfig, javascript, comments, typescript, regexp } from '@kazupon/eslint-config'

export default defineConfig(
  javascript(),
  comments(),
  regexp(),
  typescript({
    parserOptions: {
      project: true
    }
  }),
  {
    name: 'ignores',
    ignores: ['tsdown.config.ts', '**/dist/*']
  }
)
