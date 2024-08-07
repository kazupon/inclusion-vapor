import { describe, test, expect } from 'vitest'
import { transformSvelteScript, transformSvelteVapor } from './transform'
import { parse } from 'svelte/compiler'
import { MagicStringAST } from 'magic-string-ast'

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
        sourceMap: true
      }) as { code: string; map: ReturnType<MagicStringAST['generateMap']> }
      expect(code).toMatchSnapshot()
      expect(code).contains(`import { ref } from 'vue/vapor'`)
      expect(code).contains('let count = ref(0)')
      expect(code).contains('count.value += 1')
      expect(map).toMatchSnapshot()
    })
  })
})
