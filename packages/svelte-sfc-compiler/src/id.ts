// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)

export const PREFIX = 'svelte-'

export function getShortId(id: string, prefix: string = PREFIX): string {
  return id.replace(prefix, '')
}

export const generate = (target: string, prefix: string = PREFIX): string => `${prefix}${target}`
