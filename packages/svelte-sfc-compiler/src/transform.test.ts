import { parse as parseBabel } from '@babel/parser'
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
      expect(code).contains('const count = ref(0)')
      expect(code).contains('count.value += 1')
      expect(code).not.contains(`let`)
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
      expect(code).contains('const count = ref(0)')
      expect(code).contains('count.value += 1')
      expect(code).not.contains(`let`)
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
      `import { readable, useWritableStore, writable, useWritableStore } from 'svelte-vapor-runtime/store'`
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
let baz = 1
console.log(foo, bar, baz)
export { bar }
`)
      expect(code).toMatchSnapshot()
      expect(code).contains(`const foo = defineModel('foo')`)
      expect(code).contains(`const bar = defineModel('bar')`)
      expect(code).contains(`console.log(foo, bar, baz.value)`)
      expect(code).not.contains(`export let foo`)
      expect(code).not.contains(`let bar`)
      expect(code).not.contains(`export { bar }`)
    })

    test('default', () => {
      const code = transformSvelteScript(`import a1 from 'foo'
export const foo = 'readonly'
export const bar = 1
a1()
let baz = 2
console.log(foo, bar, baz)
export { baz }
`)
      expect(code).toMatchSnapshot()
      expect(code).contains(`import a1 from 'foo'`)
      expect(code).contains(`const baz = defineModel('baz', { default: 2 })`)
      expect(code).contains(`const { foo = 'readonly', bar = 1 } = defineProps(['foo', 'bar'])`)
      expect(code).contains(`console.log(foo, bar, baz)`)
      expect(code).not.contains(`export const foo = 'readonly'`)
      expect(code).not.contains(`export const bar = 1`)
      expect(code).not.contains(`let baz = 2`)
      expect(code).not.contains(`export { baz }`)
    })
  })

  describe('$ label statement', () => {
    test('block statement', () => {
      const code = transformSvelteScript(`const a = 1
let b = 2
$: {
  console.log(a, b)
}`)
      expect(code).toMatchSnapshot()
      expect(code).contains(`import { ref, watchEffect } from 'vue/vapor'`)
      expect(code).contains(`const b = ref(2)`)
      expect(code).contains(`watchEffect(() =>`)
      expect(code).contains(`console.log(a, b.value)`)
      expect(code).not.contains(`let`)
      expect(code).not.contains(`$: {`)
    })

    test('assign expression', () => {
      const code = transformSvelteScript(`let a = 1
function foo(v) {
  a = v
}
$: b = a
$: c = bar(b) * 2
$: foo(c)
function bar(d) {
  return b + c + d
}
console.log(b, c, bar(1))
`)
      expect(code).toMatchSnapshot()
      expect(code).contains(`import { ref, computed, watchEffect } from 'vue/vapor'`)
      expect(code).contains(`const a = ref(1)`)
      expect(code).contains(`const b = computed(() => a.value)`)
      expect(code).contains(`const c = computed(() => bar(b.value) * 2)`)
      expect(code).contains(`watchEffect(() => foo(c.value))`)
      expect(code).contains(`return b.value + c.value + d`)
      expect(code).contains(`console.log(b.value, c.value, bar(1))`)
      expect(code).not.contains(`let`)
      expect(code).not.contains(`$: `)
    })
  })

  describe('script context module', () => {
    test('basic', () => {
      const moduleCode = `export let foo = 'hello'
let bar = 1
bar.toString()
const buz = () => {}
export function fn1() {
  console.log('fn1', foo)
}`
      const moduleAst = parseBabel(moduleCode, { sourceType: 'module' })
      const code = transformSvelteScript(
        `let a = 1
function setFoo() {
  a = foo
}`,
        { moduleAst, moduleCode }
      )
      expect(code).toMatchSnapshot()
      expect(code).contains(`import { ref } from 'vue/vapor'`)
      expect(code).contains(`const foo = ref('hello')`)
      expect(code).contains(`const bar = ref(1)`)
      expect(code).contains(`bar.value.toString()`)
      expect(code).contains(`const buz = () => {}`)
      expect(code).contains(`function fn1() {`)
      expect(code).contains(`console.log('fn1', foo.value)`)
      expect(code).contains(`const a = ref(1)`)
      expect(code).contains(`function setFoo() {`)
      expect(code).contains(`a.value = foo.value`)
    })
  })
})
