// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `sveltejs/svelte`
// Author: Rich Harris (https://github.com/Rich-Harris) and Svelte community
// Repository url: https://github.com/sveltejs/svelte
// Code url: https://github.com/sveltejs/svelte/blob/svelte-4/packages/svelte/types/index.d.ts

export interface Spring<T> extends Readable<T> {
  set: (new_value: T, opts?: SpringUpdateOpts) => Promise<void>
  update: (fn: Updater<T>, opts?: SpringUpdateOpts) => Promise<void>
  precision: number
  damping: number
  stiffness: number
}

export interface Tweened<T> extends Readable<T> {
  set(value: T, opts?: TweenedOptions<T>): Promise<void>
  update(updater: Updater<T>, opts?: TweenedOptions<T>): Promise<void>
}
/** Callback to inform of a value updates. */
type Subscriber<T> = (value: T) => void

/** Unsubscribes from value updates. */
type Unsubscriber = () => void

/** Readable interface for subscribing. */
interface Readable<T> {
  /**
   * Subscribe on value changes.
   * @param run subscription callback
   * @param invalidate cleanup callback
   */
  subscribe(this: void, run: Subscriber<T>, invalidate?: Invalidator<T>): Unsubscriber
}
interface SpringOpts {
  stiffness?: number
  damping?: number
  precision?: number
}

interface SpringUpdateOpts {
  hard?: any // eslint-disable-line @typescript-eslint/no-explicit-any
  soft?: string | number | boolean
}

type Updater<T> = (target_value: T, value: T) => T

interface TweenedOptions<T> {
  delay?: number
  duration?: number | ((from: T, to: T) => number)
  easing?: (t: number) => number
  interpolate?: (a: T, b: T) => (t: number) => T
}
/** Cleanup logic callback. */
type Invalidator<T> = (value?: T) => void
/**
 * The spring function in Svelte creates a store whose value is animated, with a motion that simulates the behavior of a spring. This means when the value changes, instead of transitioning at a steady rate, it "bounces" like a spring would, depending on the physics parameters provided. This adds a level of realism to the transitions and can enhance the user experience.
 *
 * https://svelte.dev/docs/svelte-motion#spring
 * */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function spring<T = any>(_value?: T, _opts?: SpringOpts): Spring<T> {
  throw new Error('TODO: implement spring')
}
/**
 * A tweened store in Svelte is a special type of store that provides smooth transitions between state values over time.
 *
 * https://svelte.dev/docs/svelte-motion#tweened
 * */
export function tweened<T>(_value?: T, _defaults?: TweenedOptions<T>): Tweened<T> {
  throw new Error('TODO: implement tweened')
}
