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
            pascalCase: true,
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
      '**/*.config.ts',
      '**/dist/*',
      '**/tsconfig.json',
      '**/*.d.ts',
      'pnpm-lock.yaml',
      'pnpm-workspace.yaml'
    ]
  }
)
