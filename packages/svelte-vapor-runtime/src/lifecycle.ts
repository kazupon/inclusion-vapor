// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `sveltejs/svelte`
// Author: Rich Harris (https://github.com/Rich-Harris) and Svelte community
// Repository url: https://github.com/sveltejs/svelte
// Code url: https://github.com/sveltejs/svelte/blob/svelte-4/packages/svelte/types/index.d.ts

import type { EventDispatcher } from './types.ts'

/**
 * Schedules a callback to run immediately before the component is updated after any state change.
 *
 * The first time the callback runs will be before the initial `onMount`
 *
 * https://svelte.dev/docs/svelte#beforeupdate
 * */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function beforeUpdate(_fn: () => any): void {
  throw new Error('TODO: implement beforeUpdate')
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
  _fn: () => NotFunction<T> | Promise<NotFunction<T>> | (() => any)
): void {
  throw new Error('TODO: implement onMount')
}

/**
 * Schedules a callback to run immediately after the component has been updated.
 *
 * The first time the callback runs will be after the initial `onMount`
 *
 * https://svelte.dev/docs/svelte#afterupdate
 * */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function afterUpdate(_fn: () => any): void {
  throw new Error('TODO: implement afterUpdate')
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
export function onDestroy(_fn: () => any): void {
  throw new Error('TODO: implement onDestroy')
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
export function setContext<T>(_key: any, _context: T): T {
  throw new Error('TODO: implement setContext')
}
/**
 * Retrieves the context that belongs to the closest parent component with the specified `key`.
 * Must be called during component initialisation.
 *
 * https://svelte.dev/docs/svelte#getcontext
 * */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getContext<T>(_key: any): T {
  throw new Error('TODO: implement getContext')
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
  throw new Error('TODO: implement getAllContexts')
}

/**
 * Checks whether a given `key` has been set in the context of a parent component.
 * Must be called during component initialisation.
 *
 * https://svelte.dev/docs/svelte#hascontext
 * */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function hasContext(_key: any): boolean {
  throw new Error('TODO: implement hasContext')
}

export function tick(): Promise<void> {
  throw new Error('TODO: implement tick')
}

/**
 * Anything except a function
 */
type NotFunction<T> = T extends Function ? never : T // eslint-disable-line @typescript-eslint/no-unsafe-function-type
