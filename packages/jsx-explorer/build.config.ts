import { execSync } from 'node:child_process'
import fs from 'node:fs/promises'
import { resolve } from 'node:path'
import { defineBuildConfig } from 'unbuild'

function commit() {
  return execSync('git rev-parse --short=7 HEAD')
    .toString()
    .replace(/(?:\r\n|\r|\n)/g, '')
}

export default defineBuildConfig({
  entries: ['src/index.ts'],
  clean: true,
  rollup: {
    output: {
      name: 'JsxExplorer',
      format: 'iife'
    },
    replace: {
      values: {
        __COMMIT__: JSON.stringify(commit()),
        __BROWSER__: 'true',
        'process.env.NODE_ENV': '"production"'
      }
    },
    inlineDependencies: true
  },
  hooks: {
    'build:done': async function ({ options: { outDir } }) {
      await fs.rename(resolve(outDir, 'index.mjs'), resolve(outDir, 'jsx-explorer.global.js'))
    }
  }
})
