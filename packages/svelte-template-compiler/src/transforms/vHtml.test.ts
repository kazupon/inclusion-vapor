import { expect, test } from 'vitest'

test.todo('@html', () => {
  const source = `<div>{@html code}</div>`
  expect(source).toBe('todo')
})
