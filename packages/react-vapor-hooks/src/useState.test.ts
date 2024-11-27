// @vitest-environment jsdom

import { describe, expect, test } from 'vitest'
import { delegate, delegateEvents, nextTick, renderEffect, setText, template } from 'vue/vapor'
import { makeRender, triggerEvent } from './_helper/index.ts'
import { useState } from './useState.ts'

const define = makeRender()

describe('useState', () => {
  test('basic', async () => {
    const { html, host } = define({
      setup() {
        const [count, setCount] = useState(0)
        return { count, setCount }
      },
      render(ctx: { count: number; setCount: (count: number) => void }) {
        const t = template('<button></button>')
        delegateEvents('click')
        const button = t()
        // eslint-disable-next-line unicorn/consistent-function-scoping
        delegate(button as HTMLElement, 'click', () => _$event => ctx.setCount(ctx.count + 1))
        renderEffect(() => {
          setText(button, `count is `, ctx.count)
        })
        return button
      }
    }).render()

    const button = host.querySelector('button') as HTMLButtonElement
    triggerEvent('click', button)
    await nextTick()

    expect(html()).toMatchSnapshot()
    expect(button.textContent).toBe('count is 1')

    triggerEvent('click', button)
    await nextTick()
    expect(button.textContent).toBe('count is 2')
  })

  test('multiple state', async () => {
    const { host } = define({
      setup() {
        const [count1, setCount1] = useState(0)
        const [count2, setCount2] = useState(0)
        return { count1, setCount1, count2, setCount2 }
      },
      render(ctx: {
        count1: number
        setCount1: (count: number) => void
        count2: number
        setCount2: (count: number) => void
      }) {
        const t = template('<button></button>')
        delegateEvents('click')
        const button1 = t()
        const button2 = t()
        // eslint-disable-next-line unicorn/consistent-function-scoping
        delegate(button1 as HTMLElement, 'click', () => _$event => ctx.setCount1(ctx.count1 + 1))
        // eslint-disable-next-line unicorn/consistent-function-scoping
        delegate(button2 as HTMLElement, 'click', () => _$event => ctx.setCount2(ctx.count2 + 1))
        renderEffect(() => {
          setText(button1, `count is `, ctx.count1)
        })
        renderEffect(() => {
          setText(button2, `count is `, ctx.count2)
        })
        return [button1, button2]
      }
    }).render()

    const button1 = host.childNodes[0] as HTMLButtonElement
    const button2 = host.childNodes[1] as HTMLButtonElement
    triggerEvent('click', button1)
    triggerEvent('click', button1)
    triggerEvent('click', button2)
    triggerEvent('click', button2)
    triggerEvent('click', button1)
    await nextTick()

    expect(button1.textContent).toBe('count is 3')
    expect(button2.textContent).toBe('count is 2')
  })

  test.todo('object state', async () => {
    // TODO:
  })

  test.todo('array state', async () => {
    // TODO:
  })

  test.todo('initializer function', async () => {
    // TODO:
  })

  test.todo('updater function', async () => {
    // TODO:
  })

  test.todo('multiple call updater function', async () => {
    // TODO:
  })

  test.todo('not call in setup', async () => {
    // TODO:
  })

  test.todo('not call in vapor component', async () => {
    // TODO:
  })

  test.todo('unexpected on setState', async () => {
    // TODO:
  })
})
