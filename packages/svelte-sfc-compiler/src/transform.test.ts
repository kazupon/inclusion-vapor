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

  test(`replace import 'svelte'`, () => {
    const code = transformSvelteScript(`import { onMount } from 'svelte'
onMount(() => { console.log('mounted') })
`)
    expect(code).toMatchSnapshot()
    expect(code).contains(`import { onMount } from 'svelte-vapor-runtime'`)
  })

  test(`replace import 'svelte/store'`, () => {
    const code = transformSvelteScript(`import { readable, writable } from 'svelte/store'
const count = readable(0)
const flag = writable(false)
flag.set(true)
console.log($count, $flag)
$flag = false
`)
    expect(code).toMatchSnapshot()
    expect(code).contains(
      `import { readable, writable, useWritableStore, useReadableStore } from 'svelte-vapor-runtime/store'`
    )
    expect(code).contains(`const $count = useReadableStore(count)`)
    expect(code).contains(`const $flag = useWritableStore(flag)`)
    expect(code).contains(`console.log($count.value, $flag.value)`)
    expect(code).contains(`$flag.value = false`)
  })

  describe('replace svelte props definition', () => {
    test('basic', () => {
      const code = transformSvelteScript(`export let foo
let bar
console.log(foo, bar)
export { bar }
`)
      expect(code).toMatchSnapshot()
      expect(code).contains(`const foo = defineModel('foo')`)
      expect(code).contains(`const bar = defineModel('bar')`)
      expect(code).contains(`console.log(foo, bar)`)
      expect(code).not.contains(`export let foo`)
      expect(code).not.contains(`let bar`)
      expect(code).not.contains(`export { bar }`)
    })

    test('default', () => {
      const code = transformSvelteScript(`export const foo = 'readonly'
export const bar = 1
let baz = 2
console.log(foo, bar, baz)
export { baz }
`)
      expect(code).toMatchSnapshot()
      expect(code).contains(`const baz = defineModel('baz', { default: 2 })`)
      expect(code).contains(`const { foo = 'readonly', bar = 1 } = defineProps(['foo', 'bar'])`)
      expect(code).contains(`console.log(foo, bar, baz)`)
      expect(code).not.contains(`export const foo = 'readonly'`)
      expect(code).not.contains(`export const bar = 1`)
      expect(code).not.contains(`let baz = 2`)
      expect(code).not.contains(`export { baz }`)
    })
  })
})
