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
  const returnValue = compile(svelteCode)
  // @ts-expect-error -- ignore
  delete returnValue['stats']
  expect(returnValue).toMatchSnapshot()
})

test('parser', () => {
  const returnValue = parse(svelteCode)
  expect(returnValue).toMatchSnapshot()
})
