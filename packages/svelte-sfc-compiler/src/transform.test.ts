import { MagicStringAST } from 'magic-string-ast'
import { parse } from 'svelte/compiler'
import { describe, expect, test } from 'vitest'
import { transformSvelteScript, transformSvelteVapor } from './transform.ts'

const jsCode = `let count = 0
const increment = () => {
  count += 1
}`

const svelteCode = `
<script>
${jsCode}
</script>

<button on:click={increment}>
  count is {count}
</button>
`

describe.skip('transformSvelteVapor', () => {
  test('MVP: counter case', () => {
    const { code } = transformSvelteVapor(svelteCode)
    expect(code).toMatchSnapshot()
  })
})

describe('transformSvelteScript', () => {
  describe('MVP: counter case', () => {
    test('code only', () => {
      const code = transformSvelteScript(jsCode)
      expect(code).toMatchSnapshot()
      expect(code).contains(`import { ref } from 'vue/vapor'`)
      expect(code).contains('let count = ref(0)')
      expect(code).contains('count.value += 1')
    })

    test('with ast', () => {
      const ast = parse(svelteCode)

      const babelFileNode = ast.instance!.content
      const svelteStr = new MagicStringAST(svelteCode)

      const { code, map } = transformSvelteScript(svelteStr.sliceNode(babelFileNode), {
        ast: ast.instance,
        id: 'test.svelte',
        sourcemap: true
      }) as { code: string; map: ReturnType<MagicStringAST['generateMap']> }
      expect(code).toMatchSnapshot()
      expect(code).contains(`import { ref } from 'vue/vapor'`)
      expect(code).contains('let count = ref(0)')
      expect(code).contains('count.value += 1')
      expect(map).toMatchSnapshot()
    })
  })

  describe('replace svelte import', () => {
    test('svelte', () => {
      const code = transformSvelteScript(`import { onMount } from 'svelte'
onMount(() => { console.log('mounted') })
`)
      expect(code).toMatchSnapshot()
      expect(code).contains(`import { onMount } from 'svelte-vapor-runtime'`)
    })

    test.todo('svelte/store', () => {
      const code = transformSvelteScript(`import { readable } from 'svelte/store'
const count = readable(0)
console.log($count)
`)
      expect(code).toMatchSnapshot()
      expect(code).contains(
        `import { readable, useRedableStore } from 'svelte-vapor-runtime/store'`
      )
      expect(code).contains(`const $count = useRedableStore(count)`)
      expect(code).contains(`console.log($count.value)`)
    })
  })
})
