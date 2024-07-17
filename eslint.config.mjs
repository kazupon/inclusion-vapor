import {
  defineConfig,
  javascript,
  comments,
  typescript,
  jsonc,
  unicorn,
  regexp
} from '@kazupon/eslint-config'

export default defineConfig(
  javascript(),
  comments(),
  regexp(),
  unicorn({
    rules: {
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/filename-case': [
        'error',
        {
          cases: {
            camelCase: true
          }
        }
      ]
    }
  }),
  typescript({
    parserOptions: {
      project: ['./tsconfig.json']
    }
  }),
  jsonc({
    json: true,
    jsonc: true,
    json5: true,
    prettier: true
  }),
  {
    name: 'ignores',
    ignores: [
      '**/tsdown.config.ts',
      'vitest.config.ts',
      '**/dist/*',
      '**/tsconfig.json',
      'pnpm-lock.yaml',
      'pnpm-workspace.yaml'
    ]
  }
)
