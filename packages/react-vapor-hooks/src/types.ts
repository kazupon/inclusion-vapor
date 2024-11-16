// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/reactivity`
// Author: Evan you (https://github.com/yyx990803) and Vue community
// Repository url: https://github.com/vuejs/core

import type { Ref } from 'vue'

/**
 * reactivity type utils
 */

export type MaybeRef<T = any> = T | Ref<T> // eslint-disable-line @typescript-eslint/no-explicit-any
export type MaybeRefOrGetter<T = any> = MaybeRef<T> | (() => T) // eslint-disable-line @typescript-eslint/no-explicit-any
