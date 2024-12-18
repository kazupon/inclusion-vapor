import { parse } from 'svelte/compiler'
import { expect, test } from 'vitest'
import { enableStructures } from './svelte.ts'

test('enableStructures', () => {
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

<style>
  .container {
    color: red;
  }
</style>
`
  const { html } = parse(code)

  enableStructures(html)
  // div.container
  const divContainer = (html.children || [])[2]
  expect(divContainer.parent).toEqual(html)
  expect(divContainer.prev).toBeUndefined()
  expect(divContainer.next).toBeUndefined()
  // div.header
  const divHeader = divContainer.children![1]
  expect(divHeader.parent).toEqual(divContainer)
  expect(divHeader.prev).toBeUndefined()
  expect(divHeader.next).toBeUndefined()
  // p
  const p = divHeader.children![1]
  // img
  const img = divHeader.children![3]
  expect(p.parent).toEqual(divHeader)
  expect(img.parent).toEqual(divHeader)
  expect(p.prev).toBeUndefined()
  expect(p.next).toEqual(img)
  expect(img.prev).toEqual(p)
  expect(img.next).toBeUndefined()
})
