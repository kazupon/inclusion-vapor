// @vitest-environment jsdom

import {
  createComponent,
  createIf,
  createTextNode,
  delegate,
  delegateEvents,
  nextTick,
  ref,
  renderEffect,
  setText,
  template
} from '@vue-vapor/vapor'
import { describe, expect, test, vi } from 'vitest'
import { makeRender, triggerEvent } from './_helper.ts'
import {
  afterUpdate,
  beforeUpdate,
  getAllContexts,
  getContext,
  hasContext,
  onDestroy,
  onMount,
  setContext,
  tick
} from './lifecycle.ts'

const define = makeRender()

describe('onMount', () => {
  test('basic', async () => {
    const mockMount = vi.fn()
    const { render } = define({
      setup() {
        onMount(mockMount)
        return {}
      },
      render() {
        return template('<button></button>')()
      }
    })

    render()
    await nextTick()

    expect(mockMount).toHaveBeenCalledTimes(1)
  })

  // NOTE: currently, vapor does not work `onUnmounted` lifecycle hook
  test.todo('unmount', async () => {
    const toggle = ref(true)
    const mockUnmount = vi.fn()
    const mockMount = vi.fn().mockImplementation(() => mockUnmount)

    const Child = {
      setup() {
        onMount(mockMount)
        return (() => {
          const t0 = template('<div></div>')
          const n0 = t0()
          return n0
        })()
      }
    }

    const { render } = define({
      setup() {
        return (() => {
          const n0 = createIf(
            () => toggle.value,
            () => createComponent(Child)
          )
          return n0
        })()
      }
    })
    render()
    await nextTick()

    toggle.value = false
    await nextTick()

    expect(mockMount).toHaveBeenCalledTimes(1)
    expect(mockUnmount).toHaveBeenCalledTimes(1)
  })
})

describe('beforeUpdate', () => {
  test('state change', async () => {
    const mockBeforeUpdate = vi.fn()
    const { render, host } = define({
      setup() {
        const count = ref(0)
        const increment = () => {
          count.value++
        }
        beforeUpdate(mockBeforeUpdate)
        return { count, increment }
      },
      render(ctx: { count: number; increment: () => void }) {
        const t = template('<button></button>')
        delegateEvents('click')
        const button = t()
        // eslint-disable-next-line unicorn/consistent-function-scoping
        delegate(button as HTMLElement, 'click', () => _$event => ctx.increment())
        renderEffect(() => {
          setText(button, `count is `, ctx.count)
        })
        return button
      }
    })

    render()
    await nextTick()
    expect(mockBeforeUpdate).toHaveBeenCalledTimes(0)

    const button = host.querySelector('button') as HTMLButtonElement
    triggerEvent('click', button)
    await nextTick()

    expect(mockBeforeUpdate).toHaveBeenCalledTimes(1)

    triggerEvent('click', button)
    await nextTick()

    expect(mockBeforeUpdate).toHaveBeenCalledTimes(2)
  })
})

describe('afterUpdate', () => {
  test('state change', async () => {
    const mockAfterUpdate = vi.fn()
    const { render, host } = define({
      setup() {
        const count = ref(0)
        const increment = () => {
          count.value++
        }
        afterUpdate(mockAfterUpdate)
        return { count, increment }
      },
      render(ctx: { count: number; increment: () => void }) {
        const t = template('<button></button>')
        delegateEvents('click')
        const button = t()
        // eslint-disable-next-line unicorn/consistent-function-scoping
        delegate(button as HTMLElement, 'click', () => _$event => ctx.increment())
        renderEffect(() => {
          setText(button, `count is `, ctx.count)
        })
        return button
      }
    })

    render()
    await nextTick()
    expect(mockAfterUpdate).toHaveBeenCalledTimes(0)

    const button = host.querySelector('button') as HTMLButtonElement
    triggerEvent('click', button)
    await nextTick()

    expect(mockAfterUpdate).toHaveBeenCalledTimes(1)

    triggerEvent('click', button)
    await nextTick()

    expect(mockAfterUpdate).toHaveBeenCalledTimes(2)
  })
})

describe('onDestroy', () => {
  // NOTE: currently, vapor does not work `onBeforeUnmount` lifecycle hook
  test.todo('basic', async () => {
    const toggle = ref(true)
    const mockOnDestroy = vi.fn()

    const Child = {
      setup() {
        onDestroy(mockOnDestroy)
        return (() => {
          const t0 = template('<div></div>')
          const n0 = t0()
          return n0
        })()
      }
    }

    const { render } = define({
      setup() {
        return (() => {
          const n0 = createIf(
            () => toggle.value,
            () => createComponent(Child)
          )
          return n0
        })()
      }
    })
    render()
    await nextTick()

    toggle.value = false
    await nextTick()

    expect(mockOnDestroy).toHaveBeenCalledTimes(1)
  })
})

test('tick', async () => {
  const { render, host } = define({
    setup() {
      const count = ref(0)
      const increment = () => {
        count.value++
      }
      return { count, increment }
    },
    render(ctx: { count: number; increment: () => void }) {
      const t = template('<button></button>')
      delegateEvents('click')
      const button = t()
      // eslint-disable-next-line unicorn/consistent-function-scoping
      delegate(button as HTMLElement, 'click', () => _$event => ctx.increment())
      renderEffect(() => {
        setText(button, `count is `, ctx.count)
      })
      return button
    }
  })
  render()

  await tick()
  const button = host.querySelector('button') as HTMLButtonElement
  expect(button.textContent).toBe('count is 0')

  triggerEvent('click', button)
  await tick()
  expect(button.textContent).toBe('count is 1')
})

describe('setContext, getContext, hasContext, getAllContexts', () => {
  test('basic', () => {
    const Parent = define({
      setup() {
        setContext('key1', 1)
        return createComponent(Middle)
      }
    })

    const Middle = {
      setup() {
        setContext('key2', 'key2-value')
        return createComponent(Child)
      }
    }

    let hasKey1 = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let _contexts = new Map<any, any>()
    const Child = {
      setup() {
        hasKey1 = hasContext('key1')
        const key1 = getContext<number>('key1')
        _contexts = getAllContexts()
        return (() => {
          const n0 = createTextNode()
          setText(n0, key1)
          return n0
        })()
      }
    }

    Parent.render()

    expect(Parent.host.textContent).toBe('1')
    expect(hasKey1).toBe(true)
    // TODO: expect(contexts.size).toBe(2)
    // TODO: expect(contexts.get('key1')).toBe(1)
    // TODO: expect(contexts.get('key2')).toBe('key2-value')
  })
})
