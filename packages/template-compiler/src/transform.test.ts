import { describe, test, expect } from 'vitest'
import { transformSvelteScript, transformSvelteVapor } from './transform'
import { parse } from 'svelte/compiler'
import { MagicStringAST } from 'magic-string-ast'

import type { File as BabelFile } from '@babel/types'

const svelteCode = `
<script>
  let count = 0
  const increment = () => {
    count += 1
  }
</script>

<button on:click={increment}>
  count is {count}
</button>
`

describe.skip('transformSvelteVapor', () => {
  test('MVP: counter case', () => {
    const { code } = transformSvelteVapor(svelteCode)
    expect(code).toMatchSnapshot()
  })
})

describe('transformSvelteScript', () => {
  test('MVP: counter case', () => {
    const ast = parse(svelteCode)

    const babelFileNode = ast.instance!.content as unknown as BabelFile
    const svelteStr = new MagicStringAST(svelteCode)

    const code = transformSvelteScript(ast.instance!, svelteStr.sliceNode(babelFileNode))
    expect(code).toMatchSnapshot()
    expect(code).contains(`import { ref } from 'vue/vapor'`)
    expect(code).contains('let count = ref(0)')
    expect(code).contains('count.value += 1')
  })
})
