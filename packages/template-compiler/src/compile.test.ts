import { describe, test, expect } from 'vitest'
import { parse } from 'svelte/compiler'
import { compile } from './compile'

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

describe('compile', () => {
  test('source code', () => {
    const { code } = compile(svelteCode, {
      sourceMap: true,
      parser: (source: string) => parse(source).html
    })
    expect(code).toMatchSnapshot('code')
    expect(code).contains(`_renderEffect(() => _setText(n1, "\\n  count is ", count, "\\n"))`)
  })

  test('ast', () => {
    const { html } = parse(svelteCode)
    const { code } = compile(html, {
      sourceMap: true
    })
    expect(code).toMatchSnapshot('code')
    expect(code).contains(`_renderEffect(() => _setText(n1, "\\n  count is ", count, "\\n"))`)
  })
})
