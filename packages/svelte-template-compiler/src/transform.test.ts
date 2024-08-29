import { vi, test, expect } from 'vitest'
import { parse } from 'svelte/compiler'
import { IRNodeTypes } from './ir'
import { transform } from './transform'

import type { RootNode } from './ir'

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

test('transform', () => {
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
