// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `sveltejs/svelte`
// Author: Rich Harris (https://github.com/Rich-Harris) and Svelte community
// Repository url: https://github.com/sveltejs/svelte
// Code url: https://github.com/sveltejs/svelte/blob/svelte-4/packages/svelte/types/index.d.ts

interface DispatchOptions {
  cancelable?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface EventDispatcher<EventMap extends Record<string, any>> {
  // Implementation notes:
  // - undefined extends X instead of X extends undefined makes this work better with both strict and nonstrict mode
  // - | null | undefined is added for convenience, as they are equivalent for the custom event constructor (both result in a null detail)
  <Type extends keyof EventMap>(
    ...args: null extends EventMap[Type]
      ? [type: Type, parameter?: EventMap[Type] | null | undefined, options?: DispatchOptions]
      : undefined extends EventMap[Type]
        ? [type: Type, parameter?: EventMap[Type] | null | undefined, options?: DispatchOptions]
        : [type: Type, parameter: EventMap[Type], options?: DispatchOptions]
  ): boolean
}
