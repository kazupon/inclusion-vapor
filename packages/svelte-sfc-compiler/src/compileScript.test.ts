import { expect, test } from 'vitest'
import { compileScript } from './compileScript.ts'
import { parse } from './parse.ts'

const svelteCode = `<script>
import { ref } from 'vue/vapor'
let count = ref(0)
const increment = () => {
  count.value += 1
}
</script>

<button on:click={increment}>
  count is {count}
</button>`

test('compileScript', () => {
  const { descriptor } = parse(svelteCode)
  const script = compileScript(descriptor, {
    id: 'test.svelte'
  })
  expect(script.scriptAst).toBeUndefined()
  expect(script.scriptSetupAst).not.toBeUndefined()
  expect(script.scriptSetupAst).toMatchSnapshot()
})
