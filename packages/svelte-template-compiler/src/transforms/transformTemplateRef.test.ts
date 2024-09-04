import { expect, test } from 'vitest'

test.todo('basic', () => {
  const source = '<div bind:this={foo} />'
  expect(source).toBe('todo')
})
