// SPDX-License-Identifier: MIT
// Forked and Modified from `svelte`
// Author: Rich Harris (https://github.com/Rich-Harris), svelte team and svelte community
// Repository url: https://github.com/sveltejs/svelte/tree/svelte-4
// Code url: https://github.com/sveltejs/svelte/blob/svelte-4/packages/svelte/src/compiler/compile/utils/hash.js

const RE_RETURN_CHARACTERS = /\r/g

export function hash(str: string): string {
  // eslint-disable-next-line unicorn/prefer-string-replace-all
  const s = str.replace(RE_RETURN_CHARACTERS, '')
  let hash = 5381
  let i = s.length

  while (i--) {
    // eslint-disable-next-line unicorn/prefer-code-point
    hash = ((hash << 5) - hash) ^ s.charCodeAt(i)
  }

  return (hash >>> 0).toString(36)
}
