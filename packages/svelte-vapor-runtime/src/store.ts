// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `sveltejs/svelte`
// Author: Rich Harris (https://github.com/Rich-Harris) and Svelte community
// Repository url: https://github.com/sveltejs/svelte
// Code url: https://github.com/sveltejs/svelte/blob/svelte-4/packages/svelte/types/index.d.ts

/** Callback to inform of a value updates. */
export type Subscriber<T> = (value: T) => void

/** Unsubscribes from value updates. */
export type Unsubscriber = () => void

/** Callback to update a value. */
export type Updater<T> = (value: T) => T

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

/**
 * Creates a `Readable` store that allows reading by subscription.
 *
 * https://svelte.dev/docs/svelte-store#readable
 * @param value initial value
 * */
export function readable<T>(
  _value?: T | undefined,
  _start?: StartStopNotifier<T> | undefined
): Readable<T> {
  throw new Error('TODO: implement readable')
}

/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 *
 * https://svelte.dev/docs/svelte-store#writable
 * @param value initial value
 * */
export function writable<T>(
  _value?: T | undefined,
  _start?: StartStopNotifier<T> | undefined
): Writable<T> {
  throw new Error('TODO: implement writable')
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
  _initial_value?: T | undefined
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
export function get<T>(_store: Readable<T>): T {
  throw new Error('TODO: implement get')
}
