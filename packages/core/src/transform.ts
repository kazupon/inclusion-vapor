import { SvelteAst } from './compiler'
import { generate } from 'astring'

export function transformSvelteScript(script: Required<SvelteAst>['instance']): string {
  // TODO:
  return generate(script.content)
}
