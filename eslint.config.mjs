import {
  defineConfig,
  javascript,
  comments,
  typescript,
  unicorn,
  regexp
} from '@kazupon/eslint-config'

export default defineConfig(
  javascript(),
  comments(),
  regexp(),
  unicorn(),
  typescript({
    parserOptions: {
      project: true
    }
  }),
  {
    name: 'ignores',
    ignores: ['tsdown.config.ts', '**/dist/*', 'pnpm-lock.yaml']
  }
)
