import path from 'node:path'
import { fileURLToPath } from 'node:url'

const resolveEntryForPkg = (p: string) =>
  path.resolve(fileURLToPath(import.meta.url), `../../packages/${p}/src/index.ts`)

const entries: Record<string, string> = {
  'jsx-vapor-compiler': resolveEntryForPkg('jsx-compiler'),
  'react-vapor-hooks': resolveEntryForPkg('react-vapor-hooks'),
  'svete-vapor-sfc-compiler': resolveEntryForPkg('svelte-sfc-compiler'),
  'svelte-vapor-template-compiler': resolveEntryForPkg('svelte-template-compiler'),
  'unplugin-react-vapor': resolveEntryForPkg('unplugin-react'),
  'unplugin-svelte-vapor': resolveEntryForPkg('unplugin-svelte')
}

export { entries }
