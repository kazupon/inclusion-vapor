// @vitest-environment jsdom

import { createComponent, createIf, nextTick, ref, template } from '@vue-vapor/vapor'
import { describe, expect, test, vi } from 'vitest'
import { makeRender } from './_helper.ts'
import { onMount } from './lifecycle.ts'

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
