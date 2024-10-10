import { describe, expect, test, vi } from 'vitest'
import { get, writable } from './store.ts'

describe('writable', () => {
  test('basic', () => {
    const count = writable(0)
    const values: number[] = []
    count.subscribe(value => {
      values.push(value)
    })
    count.set(1)
    count.update(n => n + 1)

    const storeValue = get(count)

    expect(values).toEqual([0, 1, 2])
    expect(storeValue.value).toBe(2)
  })

  test('callback', () => {
    const mockUnsubscribe = vi.fn()
    const mockStart = vi.fn().mockImplementation(() => {
      return mockUnsubscribe
    })
    const mockSubscribe = vi.fn()

    const count = writable(0, mockStart)
    count.set(2)
    const unsubscribe = count.subscribe(mockSubscribe)
    unsubscribe()

    expect(mockStart).toHaveBeenCalledTimes(1)
    expect(mockSubscribe).toHaveBeenCalledTimes(1)
    expect(mockSubscribe).toHaveBeenCalledWith(2)
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
  })
})

test.todo('readable', () => {})

describe.todo('derived', () => {})
