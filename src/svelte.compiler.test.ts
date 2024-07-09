import { test, expect } from 'vitest'
import { compile, parse, preprocess as _pre } from 'svelte/compiler'

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

test('compile', () => {
  const ret = compile(svelteCode)
  // @ts-expect-error -- ignore
  delete ret['stats']
  expect(ret).toMatchSnapshot()
})

test('parser', () => {
  const ret = parse(svelteCode)
  expect(ret).toMatchSnapshot()
})
