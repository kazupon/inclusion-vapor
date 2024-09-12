// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `sveltejs/svelte`
// Author: Rich Harris (https://github.com/Rich-Harris) and Svelte community
// Repository url: https://github.com/sveltejs/svelte
// Code url: https://github.com/sveltejs/svelte/blob/svelte-4/packages/svelte/types/index.d.ts

/* eslint-disable @typescript-eslint/no-explicit-any */

export type EasingFunction = (t: number) => number

export interface TransitionConfig {
  delay?: number
  duration?: number
  easing?: EasingFunction
  css?: (t: number, u: number) => string
  tick?: (t: number, u: number) => void
}

export interface BlurParams {
  delay?: number
  duration?: number
  easing?: EasingFunction
  amount?: number | string
  opacity?: number
}

export interface FadeParams {
  delay?: number
  duration?: number
  easing?: EasingFunction
}

export interface FlyParams {
  delay?: number
  duration?: number
  easing?: EasingFunction
  x?: number | string
  y?: number | string
  opacity?: number
}

export interface SlideParams {
  delay?: number
  duration?: number
  easing?: EasingFunction
  axis?: 'x' | 'y'
}

export interface ScaleParams {
  delay?: number
  duration?: number
  easing?: EasingFunction
  start?: number
  opacity?: number
}

export interface DrawParams {
  delay?: number
  speed?: number
  duration?: number | ((len: number) => number)
  easing?: EasingFunction
}

export interface CrossfadeParams {
  delay?: number
  duration?: number | ((len: number) => number)
  easing?: EasingFunction
}
/**
 * Animates a `blur` filter alongside an element's opacity.
 *
 * https://svelte.dev/docs/svelte-transition#blur
 * */
export function blur(_node: Element, _params?: BlurParams): TransitionConfig {
  throw new Error('TODO: implement blur')
}

/**
 * Animates the opacity of an element from 0 to the current opacity for `in` transitions and from the current opacity to 0 for `out` transitions.
 *
 * https://svelte.dev/docs/svelte-transition#fade
 * */
export function fade(_node: Element, _params?: FadeParams): TransitionConfig {
  throw new Error('TODO: implement fade')
}

/**
 * Animates the x and y positions and the opacity of an element. `in` transitions animate from the provided values, passed as parameters to the element's default values. `out` transitions animate from the element's default values to the provided values.
 *
 * https://svelte.dev/docs/svelte-transition#fly
 * */
export function fly(_node: Element, _params?: FlyParams): TransitionConfig {
  throw new Error('TODO: implement fly')
}

/**
 * Slides an element in and out.
 *
 * https://svelte.dev/docs/svelte-transition#slide
 * */
export function slide(_node: Element, _params?: SlideParams): TransitionConfig {
  throw new Error('TODO: implement slide')
}

/**
 * Animates the opacity and scale of an element. `in` transitions animate from an element's current (default) values to the provided values, passed as parameters. `out` transitions animate from the provided values to an element's default values.
 *
 * https://svelte.dev/docs/svelte-transition#scale
 * */
export function scale(_node: Element, _params?: ScaleParams): TransitionConfig {
  throw new Error('TODO: implement scale')
}

/**
 * Animates the stroke of an SVG element, like a snake in a tube. `in` transitions begin with the path invisible and draw the path to the screen over time. `out` transitions start in a visible state and gradually erase the path. `draw` only works with elements that have a `getTotalLength` method, like `<path>` and `<polyline>`.
 *
 * https://svelte.dev/docs/svelte-transition#draw
 * */
export function draw(
  _node: SVGElement & {
    getTotalLength(): number
  },
  _params?: DrawParams
): TransitionConfig {
  throw new Error('TODO: implement draw')
}

/**
 * The `crossfade` function creates a pair of [transitions](https://svelte.dev/docs#template-syntax-element-directives-transition-fn) called `send` and `receive`. When an element is 'sent', it looks for a corresponding element being 'received', and generates a transition that transforms the element to its counterpart's position and fades it out. When an element is 'received', the reverse happens. If there is no counterpart, the `fallback` transition is used.
 *
 * https://svelte.dev/docs/svelte-transition#crossfade
 * */
export function crossfade({
  fallback,
  ..._defaults
}: CrossfadeParams & {
  fallback?:
    | ((node: Element, params: CrossfadeParams, intro: boolean) => TransitionConfig)
    | undefined
}): [
  (
    node: any,
    params: CrossfadeParams & {
      key: any
    }
  ) => () => TransitionConfig,
  (
    node: any,
    params: CrossfadeParams & {
      key: any
    }
  ) => () => TransitionConfig
] {
  throw new Error('TODO: implement crossfade')
}

/* eslint-enable @typescript-eslint/no-explicit-any */
