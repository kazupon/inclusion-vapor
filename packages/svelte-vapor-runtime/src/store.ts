// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `sveltejs/svelte`
// Author: Rich Harris (https://github.com/Rich-Harris) and Svelte community
// Repository url: https://github.com/sveltejs/svelte
// Code url: https://github.com/sveltejs/svelte/blob/svelte-4/packages/svelte/src/runtime/store/index.js

import { computed, onScopeDispose, ref, readonly as vaporReadonly } from 'vue/vapor'
import { isFunction } from './utils.ts'

import type { DeepReadonly } from '@vue-vapor/reactivity'
import type { Ref } from 'vue/vapor'

/**
 * NOTE:
 * This implementation is a ported from `svelte/store`.
 * Because `svelte/store` cannot tree-shake fully, if we use `svelte/store` directly. it will be bundled SvelteComponent implementation code...
 */

/** Callback to inform of a value updates. */
export type Subscriber<T> = (value: T) => void

/** Unsubscribes from value updates. */
export type Unsubscriber = () => void

/** Callback to update a value. */
export type Updater<T> = (value: T) => T

type SubscribeInvalidateTuple<T> = [Subscriber<T>, Invalidator<T>]

/**
 * Start and stop notification callbacks.
 * This function is called when the first subscriber subscribes.
 *
 * @param set Function that sets the value of the store.
 * @param update Function that sets the value of the store after passing the current value to the update function.
 * @returns Optionally, a cleanup function that is called when the last remaining
 * subscriber unsubscribes.
 */
export type StartStopNotifier<T> = (
  set: (value: T) => void,
  update: (fn: Updater<T>) => void
) => void | (() => void)

/** Readable interface for subscribing. */
export interface Readable<T> {
  /**
   * Subscribe on value changes.
   * @param run subscription callback
   * @param invalidate cleanup callback
   */
  subscribe(run: Subscriber<T>, invalidate?: Invalidator<T>): Unsubscriber
}

/** Writable interface for both updating and subscribing. */
export interface Writable<T> extends Readable<T> {
  /**
   * Set value and inform subscribers.
   * @param value to set
   */
  set(value: T): void

  /**
   * Update value using callback and inform subscribers.
   * @param updater callback
   */
  update(updater: Updater<T>): void
}
/** Cleanup logic callback. */
type Invalidator<T> = (value?: T) => void

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SUBSCRIBER_QUEUE: any[] = []

const NOOP = () => {}

/**
 * Creates a `Readable` store that allows reading by subscription.
 *
 * https://svelte.dev/docs/svelte-store#readable
 * @param value initial value
 * */
export function readable<T>(value?: T, start?: StartStopNotifier<T>): Readable<T> {
  return readonly(writable(value, start))
}

/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 *
 * https://svelte.dev/docs/svelte-store#writable
 * @param value initial value
 * */
export function writable<T>(value?: T, start: StartStopNotifier<T> = NOOP): Writable<T> {
  let stop: Unsubscriber | undefined | null
  const subscribers: Set<SubscribeInvalidateTuple<T>> = new Set<SubscribeInvalidateTuple<T>>()

  function set(newValue: T): void {
    // @ts-expect-error -- FIXME:
    if (safeNotEqual(value, newValue)) {
      value = newValue
      if (stop) {
        // store is ready
        const runQueue = !SUBSCRIBER_QUEUE.length // eslint-disable-line unicorn/explicit-length-check
        for (const subscriber of subscribers) {
          subscriber[1]()
          SUBSCRIBER_QUEUE.push(subscriber, value)
        }
        if (runQueue) {
          for (let i = 0; i < SUBSCRIBER_QUEUE.length; i += 2) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            SUBSCRIBER_QUEUE[i][0](SUBSCRIBER_QUEUE[i + 1])
          }
          SUBSCRIBER_QUEUE.length = 0
        }
      }
    }
  }

  function update(fn: Updater<T>): void {
    set(fn(value as T))
  }

  function subscribe(run: Subscriber<T>, invalidate: Invalidator<T> = NOOP): Unsubscriber {
    const subscriber: SubscribeInvalidateTuple<T> = [run, invalidate]
    subscribers.add(subscriber)
    if (subscribers.size === 1) {
      stop = start(set, update) || NOOP
    }
    run(value as T)
    return () => {
      subscribers.delete(subscriber)
      if (subscribers.size === 0 && stop) {
        stop()
        stop = null // eslint-disable-line unicorn/no-null
      }
    }
  }

  return { set, update, subscribe }
}

function safeNotEqual(a: unknown, b: undefined): boolean {
  // eslint-disable-next-line unicorn/no-negated-condition
  return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function'
}

/** One or more `Readable`s. */
type Stores =
  | Readable<any> // eslint-disable-line @typescript-eslint/no-explicit-any
  | [Readable<any>, ...Array<Readable<any>>] // eslint-disable-line @typescript-eslint/no-explicit-any
  | Array<Readable<any>> // eslint-disable-line @typescript-eslint/no-explicit-any

/** One or more values from `Readable` stores. */
type StoresValues<T> =
  T extends Readable<infer U> ? U : { [K in keyof T]: T[K] extends Readable<infer U> ? U : never }

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type, @typescript-eslint/no-explicit-any
function run(fn: Function): any {
  return fn() // eslint-disable-line @typescript-eslint/no-unsafe-call
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
function runAll(fns: Function[]): void {
  fns.forEach(run) // eslint-disable-line unicorn/no-array-callback-reference
}

/**
 * Derived value store by synchronizing one or more readable stores and
 * applying an aggregation function over its input values.
 *
 * https://svelte.dev/docs/svelte-store#derived
 * */
export function derived<S extends Stores, T>(
  stores: S,
  fn: (
    values: StoresValues<S>,
    set?: (value: T) => void,
    update?: (fn: Updater<T>) => void
  ) => T | Unsubscriber | void,
  initialValue?: T
): Readable<T> {
  const single = !Array.isArray(stores)
  const storesArray = single ? [stores] : stores
  if (!storesArray.every(Boolean)) {
    throw new Error('derived() expects stores as input, got a falsy value')
  }
  const auto = fn.length < 2
  return readable(initialValue, (set, update) => {
    let started = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const values: any[] = []
    let pending = 0
    let cleanup: T | (() => void) = NOOP

    const sync = () => {
      if (pending) {
        return
      }
      // @ts-expect-error -- FIXME:
      cleanup()
      const result = fn(
        single ? (values[0] as StoresValues<S>) : (values as StoresValues<S>),
        set,
        update
      ) as T
      if (auto) {
        set(result)
      } else {
        cleanup = isFunction(result) ? result : NOOP
      }
    }

    // @ts-expect-error -- FIXME:
    const unsubscribers = storesArray.map((store: Readable<T>, i: number) =>
      subscribe(
        store,
        value => {
          values[i] = value
          pending &= ~(1 << i)
          if (started) {
            sync()
          }
        },
        () => {
          pending |= 1 << i
        }
      )
    ) as Unsubscriber[]

    started = true
    sync()

    return function stop() {
      runAll(unsubscribers)
      // @ts-expect-error -- FIXME:
      cleanup()
      // We need to set this to false because callbacks can still happen despite having unsubscribed:
      // Callbacks might already be placed in the queue which doesn't know it should no longer
      // invoke this derived store.
      started = false
    }
  })
}

/**
 * Takes a store and returns a new one derived from the old one that is readable.
 *
 * https://svelte.dev/docs/svelte-store#readonly
 * @param store  - store to make readonly
 * */
export function readonly<T>(store: Readable<T>): Readable<T> {
  return {
    subscribe: store.subscribe.bind(store)
  }
}

/**
 * Get the current value from a store by subscribing and immediately unsubscribing.
 *
 * https://svelte.dev/docs/svelte-store#get
 * */
export function get<T>(store: Readable<T>): T {
  let value = ref() as T
  subscribe(store, _ => (value = _))()
  return value
}

function subscribe<T>(store: Readable<T> | undefined, ...callbacks: Subscriber<T>[]): Unsubscriber {
  if (store == undefined) {
    for (const callback of callbacks) {
      callback(undefined as T)
    }
    return NOOP
  }
  // @ts-expect-error -- IGNORE
  const unsub = store.subscribe(...callbacks)

  // @ts-expect-error -- IGNORE
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
  return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub
}

/**
 * vapor composable for svelte writable store
 *
 * @description
 * This composable is a wrapper for svelte writable store.
 * This composable will be injected by unplugin-svelte on transform phase, after analysis for prefixed with `$`
 * see about: https://svelte.dev/docs/svelte-components#script-4-prefix-stores-with-$-to-access-their-values
 *
 * usecase
 * ```ts
 * import { writable } from 'svelte/store'
 * const count = writable(0)
 * console.log($count)
 * count.set(1)
 * $count = 2
 * ```
 *
 * The above code will be transformed to:
 * ```ts
 * import { writable, useWritableStore } from 'svelte-vapor-runtime/store' // replace import source path, and export `useWritableStore`
 * const count = writable(0)
 * const $count = useWritableStore(count) // injected by unplugin-svelte
 * console.log($count.value) // modified by unplugin-svelte
 * count.set(1)
 * $count.value = 2 // modified by unplugin-svelte
 * ```
 */
export function useWritableStore<T>(store: Writable<T>): Ref<T> {
  const refValue: Ref<T> = ref() as Ref<T>
  onScopeDispose(
    store.subscribe(v => {
      refValue.value = v
    })
  )
  return computed({
    get: () => refValue.value,
    set: v => store.set(v)
  })
}

/**
 * vapor composable for svelte readable store
 *
 * @description
 * This composable is a wrapper for svelte readable store.
 * This composable will be injected by unplugin-svelte on transform phase, after analysis for prefixed with `$`
 * see about: https://svelte.dev/docs/svelte-components#script-4-prefix-stores-with-$-to-access-their-values
 *
 * usecase
 * ```ts
 * import { readable } from 'svelte/store'
 * const count = readable(0)
 * console.log($count)
 * ```
 *
 * The above code will be transformed to:
 * ```ts
 * import { readable, useReadableStore } from 'svelte-vapor-runtime/store' // replace import source path, and export `useReadableStore`
 * const count = readable(0)
 * const $count = useReadableStore(count) // injected by unplugin-svelte
 * console.log($count.value) // modified by unplugin-svelte
 * ```
 */
export function useReadableStore<T>(store: Readable<T>): Readonly<Ref<DeepReadonly<T>>> {
  const refValue: Ref<T> = ref() as Ref<T>
  onScopeDispose(
    store.subscribe(v => {
      refValue.value = v
    })
  )
  return vaporReadonly(refValue)
}
