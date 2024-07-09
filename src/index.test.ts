import { test, expect } from 'vitest'
import { add } from './index.js'

test('add', () => {
  expect(add(1, 2)).toBe(3)
})
