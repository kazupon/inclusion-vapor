import chalk from 'chalk'
import fg from 'fast-glob'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

async function run() {
  // fix cjs exports
  const files = await fg('*.cjs', {
    ignore: ['chunk-*'],
    absolute: true,
    cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist')
  })
  for (const file of files) {
    console.log(chalk.cyan.inverse(' POST '), `Fix ${path.basename(file)}`)
    let code = await fs.readFile(file, 'utf8')
    code = code.replace('exports.default =', 'module.exports =')
    code += 'exports.default = module.exports;'
    await fs.writeFile(file, code)
  }
}

await run()
