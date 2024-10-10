// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `sveltejs/svelte`
// Author: Rich Harris (https://github.com/Rich-Harris) and Svelte community
// Repository url: https://github.com/sveltejs/svelte
// Code url: https://github.com/sveltejs/svelte/blob/svelte-4/packages/svelte/types/index.d.ts

import { ref } from '@vue-vapor/vapor'

import type { Ref } from '@vue-vapor/vapor'

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
  subscribe(this: void, run: Subscriber<T>, invalidate?: Invalidator<T>): Unsubscriber
}

/** Writable interface for both updating and subscribing. */
export interface Writable<T> extends Readable<T> {
  /**
   * Set value and inform subscribers.
   * @param value to set
   */
  set(this: void, value: T): void

  /**
   * Update value using callback and inform subscribers.
   * @param updater callback
   */
  update(this: void, updater: Updater<T>): void
}
/** Cleanup logic callback. */
type Invalidator<T> = (value?: T) => void

/** One or more `Readable`s. */
type Stores =
  | Readable<any> // eslint-disable-line @typescript-eslint/no-explicit-any
  | [Readable<any>, ...Array<Readable<any>>] // eslint-disable-line @typescript-eslint/no-explicit-any
  | Array<Readable<any>> // eslint-disable-line @typescript-eslint/no-explicit-any

/** One or more values from `Readable` stores. */
type StoresValues<T> =
  T extends Readable<infer U> ? U : { [K in keyof T]: T[K] extends Readable<infer U> ? U : never }

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
  return {
    subscribe: writable(value, start).subscribe
  }
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

/**
 * Derived value store by synchronizing one or more readable stores and
 * applying an aggregation function over its input values.
 *
 * https://svelte.dev/docs/svelte-store#derived
 * */
export function derived<S extends Stores, T>(
  _stores: S,
  _fn: (
    values: StoresValues<S>,
    set?: (value: T) => void,
    update?: (fn: Updater<T>) => void
  ) => Unsubscriber | void,
  _initial_value?: T
): Readable<T> {
  throw new Error('TODO: implement derived')
}

/**
 * Takes a store and returns a new one derived from the old one that is readable.
 *
 * https://svelte.dev/docs/svelte-store#readonly
 * @param store  - store to make readonly
 * */
export function readonly<T>(_store: Readable<T>): Readable<T> {
  throw new Error('TODO: implement readonly')
}

/**
 * Get the current value from a store by subscribing and immediately unsubscribing.
 *
 * https://svelte.dev/docs/svelte-store#get
 * */
export function get<T>(store: Readable<T>): Ref<T> {
  const value: Ref<T | undefined> = ref(undefined)
  subscribe(store, _ => {
    value.value = _
  })()
  return value as Ref<T>
}

function subscribe<T>(store: Readable<T> | undefined, ...callbacks: Subscriber<T>[]): Unsubscriber {
  if (store == undefined) {
     
    for (const callback of callbacks) {
      callback(undefined as T)
    }
    return NOOP
  }
  // @ts-expect-error -- IGNORE
  return store.subscribe(...callbacks)
  //return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
