// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)

export function pushArray<T>(array: T[], items: T[]): void {
  // eslint-disable-next-line unicorn/no-for-loop
  for (let i = 0; i < items.length; i++) {
    array.push(items[i])
  }
}
