import {
  defineConfig,
  javascript,
  comments,
  typescript,
  jsonc,
  unicorn,
  regexp,
  vue,
  react,
  // svelte,
  yaml,
  toml
} from '@kazupon/eslint-config'

export default defineConfig(
  javascript(),
  comments(),
  regexp(),
  unicorn({
    rules: {
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/no-nested-ternary': 'off', // conflict with prettier
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
    // TODO:
    // sometimes, Resolving `parserOptions.project` is not working in `.svelte` files.
    // extraFileExtensions: ['.vue', '.svelte']
    extraFileExtensions: ['.vue']
  }),
  jsonc({
    json: true,
    jsonc: true,
    json5: true,
    prettier: true
  }),
  toml({
    rules: {
      'toml/array-bracket-spacing': 'off' // conflict with prettier
    }
  }),
  react({
    refresh: true,
    rules: {
      'react/react-in-jsx-scope': 'off'
    }
  }),
  vue({
    typescript: true,
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/singleline-html-element-content-newline': 'off', // conflict with prettier
      'vue/max-attributes-per-line': 'off' // conflict with prettier
    }
  }),
  // TODO:
  // sometimes, Resolving `parserOptions.project` is not working in `.svelte` files.
  // svelte({
  //   typescript: true
  // }),
  yaml({
    prettier: true
  }),
  {
    name: 'ignores',
    ignores: [
      // TODO:
      // sometimes, Resolving `parserOptions.project` is not working in `.svelte` files.
      '**/*.svelte',
      '**/*.config.ts',
      '**/dist/*',
      '**/tsconfig.json',
      '**/*.d.ts',
      'pnpm-lock.yaml',
      'pnpm-workspace.yaml',
      'packages/unplugin-react/src/core/refreshUtils.js'
    ]
  }
)
