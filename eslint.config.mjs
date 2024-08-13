import {
  defineConfig,
  javascript,
  comments,
  typescript,
  jsonc,
  unicorn,
  regexp,
  vue,
  svelte
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
      ],
      'unicorn/no-array-for-each': 'off'
    }
  }),
  typescript({
    parserOptions: {
      project: ['./tsconfig.json']
    },
    extraFileExtensions: ['.vue', '.svelte']
  }),
  jsonc({
    json: true,
    jsonc: true,
    json5: true,
    prettier: true
  }),
  vue({
    typescript: true,
    rules: {
      'vue/multi-word-component-names': 'off'
    }
  }),
  svelte({
    typescript: true
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
