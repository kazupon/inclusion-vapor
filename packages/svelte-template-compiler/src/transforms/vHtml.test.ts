import { expect, test } from 'vitest'

test('@html', () => {
  const source = `<div>{@html code}</div>`
  expect(source).toBe('todo')
})
