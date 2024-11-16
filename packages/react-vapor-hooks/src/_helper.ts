/**
 * Helper module for unit tests
 */

import { afterEach, beforeEach } from 'vitest'
import { createVaporApp, defineComponent } from 'vue/vapor'

import type { App, ComponentInternalInstance, ObjectComponent, SetupFn } from 'vue/vapor'
type RawProps = NonNullable<Parameters<typeof createVaporApp>[1]>

// forked from `vuejs/core-vapor` test utils

export function makeRender<Component = ObjectComponent | SetupFn>(
  initHost = (): HTMLDivElement => {
    const host = document.createElement('div')
    host.setAttribute('id', 'host')
    document.body.append(host)
    return host
  }
) {
  let host: HTMLElement
  function resetHost() {
    return (host = initHost())
  }

  beforeEach(() => {
    resetHost()
  })
  afterEach(() => {
    host.remove()
  })

  function define(comp: Component) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    const component = defineComponent(comp as any)
    let instance: ComponentInternalInstance | undefined
    let app: App

    function render(props: RawProps = {}, container: string | ParentNode = host) {
      create(props)
      return mount(container)
    }

    function create(props: RawProps = {}) {
      app?.unmount()
      app = createVaporApp(component, props)
      return res()
    }

    function mount(container: string | ParentNode = host) {
      instance = app.mount(container)
      return res()
    }

    // eslint-disable-next-line unicorn/consistent-function-scoping
    function html() {
      return host.innerHTML
    }

    const res = () => ({
      component,
      host,
      instance,
      app,
      create,
      mount,
      render,
      resetHost,
      html
    })

    return res()
  }

  return define
}

export function triggerEvent(type: string, el: Element) {
  const event = new Event(type, { bubbles: true })
  el.dispatchEvent(event)
}
