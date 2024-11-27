// @vitest-environment jsdom

import { describe, expect, test, vi } from 'vitest'
import { delegate, delegateEvents, nextTick, renderEffect, setText, template } from 'vue/vapor'
import { makeRender, triggerEvent } from './_helper/index.ts'
import {
  derived,
  get,
  readable,
  readonly,
  useReadableStore,
  useWritableStore,
  writable
} from './store.ts'

const define = makeRender()

describe('svelte/store', () => {
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
      expect(storeValue).toBe(2)
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

  test('readable', () => {
    const readableStore = readable(100)
    const mockSubscribe = vi.fn()
    const unsub = readableStore.subscribe(mockSubscribe)
    unsub()

    expect(get(readableStore)).toBe(100)
    expect(mockSubscribe).toHaveBeenCalledTimes(1)
    expect(mockSubscribe).toHaveBeenCalledWith(100)
  })

  test('derived', () => {
    const a = readable(1)
    const b = writable(2)
    const summed = derived([a, b], ([$a, $b]) => $a + $b)
    const mockSubscribe = vi.fn()
    const unsub = summed.subscribe(mockSubscribe)
    unsub()

    expect(get(summed)).toBe(3)
    expect(mockSubscribe).toHaveBeenCalledTimes(1)
    expect(mockSubscribe).toHaveBeenCalledWith(3)
  })

  test('readonly', () => {
    const mockSubscribe = vi.fn()
    const mockUnsubscribe = vi.fn()
    const writableStore = writable(0, (set, update) => {
      set(1)
      update(n => n + 1)
      return mockUnsubscribe
    })
    const unsub = writableStore.subscribe(mockSubscribe)
    const readableStore = readonly(writableStore)
    unsub()

    expect(get(readableStore)).toBe(2)
    expect(mockSubscribe).toHaveBeenCalledTimes(1)
    expect(mockSubscribe).toHaveBeenCalledWith(2)
    expect(mockUnsubscribe).toHaveBeenCalledTimes(2)
  })
})

test('useWritableStore', async () => {
  let updateValue = 0
  const { render, host } = define({
    setup() {
      const count = writable(0)
      const $count = useWritableStore(count)
      const increment = () => {
        if ($count.value === 1) {
          $count.value = 4
          updateValue = get(count)
        } else {
          count.set(get(count) + 1)
        }
      }
      return { $count, increment }
    },
    render(ctx: { $count: number; increment: () => void }) {
      const t = template('<button></button>')
      delegateEvents('click')
      const button = t()
      // eslint-disable-next-line unicorn/consistent-function-scoping
      delegate(button as HTMLElement, 'click', () => _$event => ctx.increment())
      renderEffect(() => {
        setText(button, `count is ${ctx.$count}`)
      })
      return button
    }
  })

  render()
  const button = host.querySelector('button') as HTMLButtonElement

  await nextTick()
  expect(button.textContent).toBe('count is 0')

  triggerEvent('click', button)
  await nextTick()
  expect(button.textContent).toBe('count is 1')

  triggerEvent('click', button)
  await nextTick()
  expect(button.textContent).toBe('count is 4')
  expect(updateValue).toBe(4)
})

describe('useReadableStore', () => {
  test('readable', async () => {
    const { render, host } = define({
      setup() {
        const msg = readable('hello')
        const $msg = useReadableStore(msg)
        return { $msg }
      },
      render(ctx: { $msg: string }) {
        const t = template('<p></p>')
        const p = t()
        renderEffect(() => {
          setText(p, `${ctx.$msg}`)
        })
        return p
      }
    })

    render()
    const p = host.querySelector('p') as HTMLParagraphElement

    await nextTick()
    expect(p.textContent).toBe('hello')
  })

  test('derived', async () => {
    const { render, host } = define({
      setup() {
        const a = readable(1)
        const b = writable(2)
        const summed = derived([a, b], ([$a, $b]) => $a + $b)
        const $sum = useReadableStore(summed)
        return { $sum }
      },
      render(ctx: { $sum: number }) {
        const t = template('<p></p>')
        const p = t()
        renderEffect(() => {
          setText(p, `${ctx.$sum}`)
        })
        return p
      }
    })

    render()
    const p = host.querySelector('p') as HTMLParagraphElement

    await nextTick()
    expect(p.textContent).toBe('3')
  })
})
