import { parse } from 'svelte/compiler'
import { describe, expect, test } from 'vitest'
import { enableStructures } from './svelte.ts'

import type { SvelteElseBlock } from './svelte.ts'

describe('enableStructures', () => {
  test('basic', () => {
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

  test('{#if expression}...{/if}', () => {
    const code = `
<script>
	let count = 1
</script>

<div>
	<p>count:</p>
	{#if count === 1}
    <p>This is count 1</p>
	{/if}
</div>
`
    const { html } = parse(code)
    enableStructures(html)

    // div
    const div = (html.children || [])[2]
    expect(div.parent).toEqual(html)
    expect(div.prev).toBeUndefined()
    expect(div.next).toBeUndefined()
    // p
    const p = div.children![1]
    // {#if}
    const ifBlock = div.children![3]
    expect(p.parent).toEqual(div)
    expect(p.prev).toBeUndefined()
    expect(p.next).toEqual(ifBlock)
    expect(ifBlock.parent).toEqual(div)
    expect(ifBlock.prev).toEqual(p)
    expect(ifBlock.next).toBeUndefined()
    // p inside {#if}
    const pInsideIf = ifBlock.children![0]
    expect(pInsideIf.parent).toEqual(ifBlock)
    expect(pInsideIf.prev).toBeUndefined()
    expect(pInsideIf.next).toBeUndefined()
  })

  test('{#if expression}...{:else if expression}...{/if}', () => {
    const code = `
<script>
	let count = 1
</script>

<div>
	<p>count:</p>
	{#if count === 1}
    <p>This is count 1</p>
  {:else if count === 2}
    <p>This is count 2</p>
    <p>Another count 2</p>
	{/if}
</div>
`
    const { html } = parse(code)
    enableStructures(html)

    // div
    const div = (html.children || [])[2]
    expect(div.parent).toEqual(html)
    expect(div.prev).toBeUndefined()
    expect(div.next).toBeUndefined()
    // p
    const p = div.children![1]
    // {#if}
    const ifBlock = div.children![3]
    expect(p.parent).toEqual(div)
    expect(p.prev).toBeUndefined()
    expect(p.next).toEqual(ifBlock)
    expect(ifBlock.parent).toEqual(div)
    expect(ifBlock.prev).toEqual(p)
    expect(ifBlock.next).toBeUndefined()
    // p inside {#if}
    const pInsideIf = ifBlock.children![0]
    expect(pInsideIf.parent).toEqual(ifBlock)
    expect(pInsideIf.prev).toBeUndefined()
    expect(pInsideIf.next).toBeUndefined()
    // {:else ..}
    const elseIfBlock = ifBlock.else as SvelteElseBlock
    expect(elseIfBlock.parent).toEqual(ifBlock)
    expect(elseIfBlock.prev).toBeUndefined()
    expect(elseIfBlock.next).toBeUndefined()
    // {... if}
    const ifBlock2 = elseIfBlock.children[0]
    expect(ifBlock2.parent).toEqual(elseIfBlock)
    expect(ifBlock2.prev).toBeUndefined()
    expect(ifBlock2.next).toBeUndefined()
    // p[0] inside {:else if}
    const pInsideElseIf1 = ifBlock2.children![0]
    // p[1] inside {:else if}
    const pInsideElseIf2 = ifBlock2.children![2]
    expect(pInsideElseIf1.parent).toEqual(ifBlock2)
    expect(pInsideElseIf1.prev).toBeUndefined()
    expect(pInsideElseIf1.next).toEqual(pInsideElseIf2)
    expect(pInsideElseIf2.parent).toEqual(ifBlock2)
    expect(pInsideElseIf2.prev).toEqual(pInsideElseIf1)
    expect(pInsideElseIf2.next).toBeUndefined()
  })

  test('{#if expression}...{:else}...{/if}', () => {
    const code = `
<script>
	let count = 1
</script>

<div>
	<p>count:</p>
	{#if count === 1}
    <p>This is count 1</p>
  {:else}
    <p>This is not count</p>
	{/if}
</div>
`
    const { html } = parse(code)
    enableStructures(html)

    // div
    const div = (html.children || [])[2]
    expect(div.parent).toEqual(html)
    expect(div.prev).toBeUndefined()
    expect(div.next).toBeUndefined()
    // p
    const p = div.children![1]
    // {#if}
    const ifBlock = div.children![3]
    expect(p.parent).toEqual(div)
    expect(p.prev).toBeUndefined()
    expect(p.next).toEqual(ifBlock)
    expect(ifBlock.parent).toEqual(div)
    expect(ifBlock.prev).toEqual(p)
    expect(ifBlock.next).toBeUndefined()
    // p inside {#if}
    const pInsideIf = ifBlock.children![0]
    expect(pInsideIf.parent).toEqual(ifBlock)
    expect(pInsideIf.prev).toBeUndefined()
    expect(pInsideIf.next).toBeUndefined()
    // {:else}
    const elseBlock = ifBlock.else as SvelteElseBlock
    expect(elseBlock.parent).toEqual(ifBlock)
    expect(elseBlock.prev).toBeUndefined()
    expect(elseBlock.next).toBeUndefined()
    // p inside {:else}
    const pInsideElse = elseBlock.children[0]
    expect(pInsideElse.parent).toEqual(elseBlock)
    expect(pInsideElse.prev).toBeUndefined()
    expect(pInsideElse.next).toBeUndefined()
  })

  test('{#each expression as name}...{/each}', () => {
    const code = `
<script>
	let items = [1]
</script>

<div>
	<h1>Shopping list</h1>
  {#each items as item}
    <p>{item.name} x {item.qty}</p>
  {/each}
</div>
`
    const { html } = parse(code)
    enableStructures(html)

    // div
    const div = (html.children || [])[2]
    expect(div.parent).toEqual(html)
    expect(div.prev).toBeUndefined()
    expect(div.next).toBeUndefined()
    // h
    const h = div.children![1]
    // {#each}
    const eachBlock = div.children![3]
    expect(h.parent).toEqual(div)
    expect(h.prev).toBeUndefined()
    expect(h.next).toEqual(eachBlock)
    expect(eachBlock.parent).toEqual(div)
    expect(eachBlock.prev).toEqual(h)
    expect(eachBlock.next).toBeUndefined()
    // p inside {#each}
    const pInsideIf = eachBlock.children![0]
    expect(pInsideIf.parent).toEqual(eachBlock)
    expect(pInsideIf.prev).toBeUndefined()
  })

  test('{#each expression as name}...{:else}...{/each}', () => {
    const code = `
<script>
	let items = [1]
</script>

<div>
	<h1>Shopping list</h1>
  {#each items as item}
    <p>{item.name} x {item.qty}</p>
  {:else}
    <p>No items</p>
  {/each}
</div>
`
    const { html } = parse(code)
    enableStructures(html)

    // div
    const div = (html.children || [])[2]
    // {#each}
    const eachBlock = div.children![3]
    // {:else}
    const elseBlock = eachBlock.else as SvelteElseBlock
    expect(elseBlock.parent).toEqual(eachBlock)
    expect(elseBlock.prev).toBeUndefined()
    expect(elseBlock.next).toBeUndefined()
    // p inside {:else}
    const pInsideIf = elseBlock.children[0]
    expect(pInsideIf.parent).toEqual(elseBlock)
    expect(pInsideIf.prev).toBeUndefined()
  })

  test('{#await expression}...{:then name}...{:catch name}...{/await}', () => {})
  test('{#await expression}...{:then name}...{/await}', () => {})
  test('{#await expression then name}...{/await}', () => {})
  test('{#await expression catch name}...{/await}', () => {})
})
