import { describe, expect, test } from 'vitest'
import { compileTemplate } from './compileTemplate.ts'
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

describe('compileScript', () => {
  test('source code', () => {
    const template = compileTemplate({
      source: svelteCode,
      filename: 'test.svelte',
      id: 'xxx'
    })
    expect(template.code).toMatchSnapshot('code')
    expect(template.code).contains(`_delegateEvents("click")`)
  })

  test('ast', () => {
    const { descriptor } = parse(svelteCode)
    const template = compileTemplate({
      source: svelteCode,
      filename: 'test.svelte',
      id: descriptor.id!,
      ast: descriptor.template!.ast
    })
    expect(template.code).toMatchSnapshot('code')
    expect(template.code).contains(`_delegateEvents("click")`)
  })
})
