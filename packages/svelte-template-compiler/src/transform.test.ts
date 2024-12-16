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

test('scopeId option', () => {
  const code = `
<script>
  let count = 0
  const increment = () => {
    count += 1
  }
</script>

<div class="container">
  <div class="header">
    <p style="color: red;">Hello</p>
    <img src="foo.jpg" width="500" height="600">
  </div>
</div>
`
  const svelteAst = parse(code)
  const ast: RootNode = {
    type: IRNodeTypes.ROOT,
    children: svelteAst.html.children || [],
    source: svelteCode,
    components: [],
    directives: [],
    helpers: new Set(),
    temps: 0
  }

  transform(ast, { scopeId: 'svelte-xxxx' })

  // div.container
  const divContainer = ast.children[2]
  expect(divContainer.prev).toBeUndefined()
  expect(divContainer.next).toBeUndefined()
  // div.header
  const divHeader = divContainer.children![1]
  expect(divHeader.prev).toBeUndefined()
  expect(divHeader.next).toBeUndefined()
  // p
  const p = divHeader.children![1]
  // img
  const img = divHeader.children![3]
  expect(p.prev).toBeUndefined()
  expect(p.next).toEqual(img)
  expect(img.prev).toEqual(p)
  expect(img.next).toBeUndefined()
})
