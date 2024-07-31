import { test, expect } from 'vitest'
import { transformSvelteScript } from './transform'
import { parse } from 'svelte/compiler'

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
test('test transform', () => {
  const ast = parse(svelteCode)
  const code = transformSvelteScript(ast.instance!)
  expect(code).toMatchSnapshot()
})
