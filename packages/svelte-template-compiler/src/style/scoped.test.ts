import { test } from 'vitest'

const _svelteCode = `
<script>
  let count = 0
  const increment = () => {
    count += 1
  }
</script>

<button on:click={increment}>
  count is {count}
</button>

<style>
  button {
    color: red;
  }
</style>
`
test('scoped style', () => {
  // const ast = parse('.example { world: "!" }')
  // if (ast.type === 'StyleSheet') { }
  // console.log(ast)
})
