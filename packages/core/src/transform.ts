import generate from '@babel/generator'

import type { SvelteScript } from './compiler'

export function transformSvelteScript(script: SvelteScript): string {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const { code, map: _ } = generate(script.content, { sourceMaps: true })
  return code
}
