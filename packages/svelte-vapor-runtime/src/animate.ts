// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `sveltejs/svelte`
// Author: Rich Harris (https://github.com/Rich-Harris) and Svelte community
// Repository url: https://github.com/sveltejs/svelte
// Code url: https://github.com/sveltejs/svelte/blob/svelte-4/packages/svelte/types/index.d.ts

export interface AnimationConfig {
  delay?: number
  duration?: number
  easing?: (t: number) => number
  css?: (t: number, u: number) => string
  tick?: (t: number, u: number) => void
}

export interface FlipParams {
  delay?: number
  duration?: number | ((len: number) => number)
  easing?: (t: number) => number
}
/**
 * The flip function calculates the start and end position of an element and animates between them, translating the x and y values.
 * `flip` stands for [First, Last, Invert, Play](https://aerotwist.com/blog/flip-your-animations/).
 *
 * https://svelte.dev/docs/svelte-animate#flip
 * */
export function flip(
  _node: Element,
  _rectInfo: {
    from: DOMRect
    to: DOMRect
  },
  _params?: FlipParams
): AnimationConfig {
  throw new Error('TODO: implement flip')
}
