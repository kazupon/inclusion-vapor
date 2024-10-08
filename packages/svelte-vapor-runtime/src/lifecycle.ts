// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `sveltejs/svelte`
// Author: Rich Harris (https://github.com/Rich-Harris) and Svelte community
// Repository url: https://github.com/sveltejs/svelte
// Code url: https://github.com/sveltejs/svelte/blob/svelte-4/packages/svelte/types/index.d.ts

import {
  getCurrentInstance,
  inject,
  nextTick,
  onBeforeUnmount,
  onBeforeUpdate,
  onMounted,
  onUnmounted,
  onUpdated,
  provide
} from '@vue-vapor/vapor'

import type { InjectionKey } from '@vue-vapor/vapor'
import type { EventDispatcher } from './types.ts'

/**
 * Schedules a callback to run immediately before the component is updated after any state change.
 *
 * The first time the callback runs will be before the initial `onMount`
 *
 * https://svelte.dev/docs/svelte#beforeupdate
 * */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function beforeUpdate(fn: () => any): void {
  const instance = getCurrentInstance()
  if (!instance) {
    throw new Error('`beforeUpdate` must be called in setup func.')
  }
  onBeforeUpdate(fn, instance)
}

/**
 * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
 * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
 * it can be called from an external module).
 *
 * If a function is returned _synchronously_ from `onMount`, it will be called when the component is unmounted.
 *
 * `onMount` does not run inside a [server-side component](https://svelte.dev/docs#run-time-server-side-component-api).
 *
 * https://svelte.dev/docs/svelte#onmount
 * */
export function onMount<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: () => NotFunction<T> | Promise<NotFunction<T>> | (() => any)
): void {
  const instance = getCurrentInstance()
  if (!instance) {
    throw new Error('`onMount` must be called in setup func.')
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let unmount: (() => any) | undefined
  onMounted(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    unmount = fn() as () => any
  }, instance)
  onUnmounted(() => {
    unmount?.()
  }, instance)
}

/**
 * Schedules a callback to run immediately after the component has been updated.
 *
 * The first time the callback runs will be after the initial `onMount`
 *
 * https://svelte.dev/docs/svelte#afterupdate
 * */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function afterUpdate(fn: () => any): void {
  const instance = getCurrentInstance()
  if (!instance) {
    throw new Error('`afterUpdate` must be called in setup func.')
  }
  onUpdated(fn, instance)
}

/**
 * Schedules a callback to run immediately before the component is unmounted.
 *
 * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
 * only one that runs inside a server-side component.
 *
 * https://svelte.dev/docs/svelte#ondestroy
 * */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function onDestroy(fn: () => any): void {
  const instance = getCurrentInstance()
  if (!instance) {
    throw new Error('`onDestroy` must be called in setup func.')
  }
  onBeforeUnmount(fn, instance)
}

/**
 * Creates an event dispatcher that can be used to dispatch [component events](https://svelte.dev/docs#template-syntax-component-directives-on-eventname).
 * Event dispatchers are functions that can take two arguments: `name` and `detail`.
 *
 * Component events created with `createEventDispatcher` create a
 * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
 * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
 * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
 * property and can contain any type of data.
 *
 * The event dispatcher can be typed to narrow the allowed event names and the type of the `detail` argument:
 * ```ts
 * const dispatch = createEventDispatcher<{
 *  loaded: never; // does not take a detail argument
 *  change: string; // takes a detail argument of type string, which is required
 *  optional: number | null; // takes an optional detail argument of type number
 * }>();
 * ```
 *
 * https://svelte.dev/docs/svelte#createeventdispatcher
 * */
export function createEventDispatcher<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  EventMap extends Record<string, any> = any
>(): EventDispatcher<EventMap> {
  throw new Error('TODO: implement createEventDispatcher')
}

/**
 * Associates an arbitrary `context` object with the current component and the specified `key`
 * and returns that object. The context is then available to children of the component
 * (including slotted content) with `getContext`.
 *
 * Like lifecycle functions, this must be called during component initialisation.
 *
 * https://svelte.dev/docs/svelte#setcontext
 * */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setContext<T>(key: any, context: T): T {
  const instance = getCurrentInstance()
  if (!instance) {
    throw new Error('`setContext` must be called in setup func.')
  }
  provide(key, context)
  return context
}
/**
 * Retrieves the context that belongs to the closest parent component with the specified `key`.
 * Must be called during component initialisation.
 *
 * https://svelte.dev/docs/svelte#getcontext
 * */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getContext<T>(key: any): T {
  const instance = getCurrentInstance()
  if (!instance) {
    throw new Error('`getContext` must be called in setup func.')
  }
  return inject(key as string | InjectionKey<T>) as T
}

/**
 * Retrieves the whole context map that belongs to the closest parent component.
 * Must be called during component initialisation. Useful, for example, if you
 * programmatically create a component and want to pass the existing context to it.
 *
 * https://svelte.dev/docs/svelte#getallcontexts
 * */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAllContexts<T extends Map<any, any> = Map<any, any>>(): T {
  const instance = getCurrentInstance()
  if (!instance) {
    throw new Error('`getAllContexts` must be called in setup func.')
  }
  const provides = instance.provides
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contexts = new Map<any, any>()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  Object.keys(Object.assign({}, provides, Object.getPrototypeOf(provides))).forEach(key => {
    contexts.set(key, provides[key])
  })
  return contexts as T
}

/**
 * Checks whether a given `key` has been set in the context of a parent component.
 * Must be called during component initialisation.
 *
 * https://svelte.dev/docs/svelte#hascontext
 * */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function hasContext(key: any): boolean {
  const instance = getCurrentInstance()
  if (!instance) {
    throw new Error('`hasContext` must be called in setup func.')
  }
  return !!inject(key as string | InjectionKey<unknown>)
}

export function tick(): Promise<void> {
  return nextTick()
}

/**
 * Anything except a function
 */
type NotFunction<T> = T extends Function ? never : T // eslint-disable-line @typescript-eslint/no-unsafe-function-type
