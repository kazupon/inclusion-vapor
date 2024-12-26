import {
  comments,
  defineConfig,
  imports,
  javascript,
  jsonc,
  markdown,
  react,
  regexp,
  toml,
  typescript,
  unicorn,
  vue,
  // svelte,
  yaml
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
    extraFileExtensions: ['.vue'],
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { disallowTypeAnnotations: false }]
    }
  }),
  imports({
    typescript: true,
    rules: {
      'import/first': 'error',
      'import/extensions': ['error', 'always', { ignorePackages: true }]
    }
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
    name: 'settings',
    settings: {
      react: {
        version: '18'
      }
    }
  },
  markdown(),
  {
    name: 'ignores',
    ignores: [
      // TODO:
      // sometimes, Resolving `parserOptions.project` is not working in `.svelte` files.
      '.vscode/**',
      '**/*.svelte',
      '**/*.config.ts',
      '**/dist/*',
      '**/tsconfig.json',
      '**/fixtures/**',
      '**/*.d.ts',
      'pnpm-lock.yaml',
      'pnpm-workspace.yaml'
    ]
  }
)
