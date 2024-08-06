import { test, expect } from 'vitest'
import { parse } from './parse'

const svelteCode = `<script>
  let count = 0
  const increment = () => {
    count += 1
  }
</script>

<button on:click={increment}>
  count is {count}
</button>

<style>
button {
  color: red;
}
</style>`

test('parse', () => {
  const { descriptor } = parse(svelteCode)
  expect(descriptor.scriptSetup?.content).toMatchSnapshot('script')
  expect(descriptor.scriptSetup?.content).contains(`<script>
  let count = 0
  const increment = () => {
    count += 1
  }
</script>`)
  expect(descriptor.scriptSetup?.loc).toMatchObject({
    start: { offset: 0, line: -1, column: -1 },
    end: { offset: 81, line: -1, column: -1 }
  })

  expect(descriptor.template?.content).toMatchSnapshot('template')
  expect(descriptor.template?.content).contains(`<button on:click={increment}>
  count is {count}
</button>`)
  expect(descriptor.template?.loc).toMatchObject({
    start: { offset: 83, line: -1, column: -1 },
    end: { offset: 141, line: -1, column: -1 }
  })

  expect(descriptor.styles[0].content).toMatchSnapshot('style')
  expect(descriptor.styles[0].content).contains(`<style>
button {
  color: red;
}`)
  expect(descriptor.styles[0]?.loc).toMatchObject({
    start: { offset: 143, line: -1, column: -1 },
    end: { offset: 184, line: -1, column: -1 }
  })
})
