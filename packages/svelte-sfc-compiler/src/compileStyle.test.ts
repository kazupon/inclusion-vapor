import { hash } from 'svelte-vapor-template-compiler'
import { expect, test } from 'vitest'
import { compileStyle } from './compileStyle.ts'
import { generate as generateId } from './id.ts'
import { parse } from './parse.ts'

import type { SvelteSFCStyleBlock } from './types.ts'

const svelteCode = `<script>
import { ref } from 'vue/vapor'
let count = ref(0)
const increment = () => {
  count.value += 1
}
</script>

<button class="green" on:click={increment}>
  count is {count}
</button>

<style>
  .green {
    color: green;
  }
</style>
`

test('compileStyle', () => {
  const { descriptor } = parse(svelteCode)
  const cssHash = hash(descriptor.styles[0].content)
  descriptor.id = cssHash

  const style = compileStyle({
    source: descriptor.styles[0].content,
    sourceAll: svelteCode,
    filename: 'test.svelte',
    id: generateId(descriptor.id),
    templateAst: descriptor.template!.ast,
    ast: (descriptor.styles[0] as SvelteSFCStyleBlock).ast
  })
  expect(style.code).toEqual(`.green.svelte-${cssHash}{color:green}`)
})
