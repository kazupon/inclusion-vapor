import { test, expect } from 'vitest'
import { compile, parse, preprocess } from 'svelte/compiler'

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

// NOTE: change to babel from acron in svelte, so not work compile (codegen)
test.skip('compile', () => {
  const returnValue = compile(svelteCode)
  // @ts-expect-error -- ignore
  delete returnValue['stats']
  expect(returnValue).toMatchSnapshot()
})

test('parser', () => {
  const returnValue = parse(svelteCode)
  expect(returnValue).toMatchSnapshot()
})

test('preprocess', async () => {
  const returnValue = await preprocess(svelteCode, {
    script(_params, ..._args) {
      // console.log('preprocess params', params)
      // console.log('preprocess args', args)
      return {
        code: `
import { onMount, computed, ref } from 'vue/vapor'
const count = ref(0)
onMount(() => {
  console.log('mounted')
})
const increment = computed(() => count.value + 1)
`
      }
    }
  })
  expect(returnValue).toMatchSnapshot()

  // const ast = parse(returnValue.code)
  // console.log('ast', (ast.instance?.content as unknown as File).program.body)
  // console.log('ast', ast.instance?.content)
})
