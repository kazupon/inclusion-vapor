import { expect, test } from 'vitest'
import { parse } from './parse.ts'

const svelteCode = `<script lang="js">
  let count = 0
  const increment = () => {
    count += 1
  }
</script>

<button on:click={increment}>
  count is {count}
</button>

<style scoped lang="css">
button {
  color: red;
}
</style>`

test('parse', () => {
  const { descriptor } = parse(svelteCode)
  expect(descriptor.scriptSetup?.content).toMatchSnapshot('script')
  expect(descriptor.scriptSetup?.content).toContain(`
  let count = 0
  const increment = () => {
    count += 1
  }`)
  expect(descriptor.scriptSetup?.loc).toMatchObject({
    start: { offset: 18, line: -1, column: -1 },
    end: { offset: 82, line: -1, column: -1 }
  })

  expect(descriptor.template?.content).toMatchSnapshot('template')
  expect(descriptor.template?.content).contains(`<button on:click={increment}>
  count is {count}
</button>`)
  expect(descriptor.template?.loc).toMatchObject({
    start: { offset: 93, line: -1, column: -1 },
    end: { offset: 151, line: -1, column: -1 }
  })

  expect(descriptor.styles[0].content).toMatchSnapshot('style')
  expect(descriptor.styles[0].content).toContain(`
button {
  color: red;
}`)
  expect(descriptor.styles[0].attrs.scoped).toBe(true)
  expect(descriptor.styles[0].attrs.lang).toBe('css')
  expect(descriptor.styles[0].loc).toMatchObject({
    start: { offset: 178, line: -1, column: -1 },
    end: { offset: 204, line: -1, column: -1 }
  })
})
