import { parse } from 'svelte/compiler'
import { expect, test, vi } from 'vitest'
import { IRNodeTypes } from './ir/index.ts'
import { transform } from './transform.ts'

import type { RootNode } from './ir/index.ts'

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

test('basic', () => {
  const svelteAst = parse(svelteCode)
  const ast: RootNode = {
    type: IRNodeTypes.ROOT,
    children: svelteAst.html.children || [],
    source: svelteCode,
    components: [],
    directives: [],
    helpers: new Set(),
    temps: 0
  }

  const afterTransform1 = vi.fn()
  const nodeTransform1 = vi.fn().mockImplementation(() => afterTransform1)
  transform(ast, {
    nodeTransforms: [nodeTransform1]
  })
  expect(nodeTransform1).toHaveBeenCalled()
  expect(afterTransform1).toHaveBeenCalled()
})
