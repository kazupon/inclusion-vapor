// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `Ubugeeei/vue-hooks`
// Author: Ubugeeei (https://github.com/Ubugeeei/vue-hooks)
// React hooks original Author: Meta Platforms, Inc, and React community

import { getCurrentInstance, shallowRef, isRef } from '@vue-vapor/vapor'
import { USI, USV } from './internal'

import type { SetStateAction, Dispatch } from 'react'
import type { Ref } from '@vue-vapor/vapor'
import type { MaybeRefOrGetter } from './types'

type VaporState<State> = MaybeRefOrGetter<State>

/**
 * react `useState` hook for vapor
 */
export function useState<State = undefined>(
  initialState?: VaporState<State> | (() => State)
): [Ref<State>, Dispatch<SetStateAction<State>>] {
  const instance = getCurrentInstance()
  if (!instance) {
    throw new Error(`'useState' must be called in a setup function`)
  }
  if (!instance.vapor) {
    throw new Error(`'useState' must be called in vapor component`)
  }

  if (instance[USV] === undefined) {
    instance[USV] = []
  }

  const currentIndex = (instance[USI] ??= 0)
  const state =
    instance[USV][currentIndex] ?? (isRef(initialState) ? initialState : shallowRef(initialState))
  instance[USV][currentIndex] = state

  function setState(newState: State | ((prev: State) => State)): void {
    if (!instance) {
      throw new Error(`unexpected on 'setState', component internal instance is null`)
    }

    if (typeof newState === 'function') {
      // use updater function
      instance[USV]![currentIndex].value = (newState as (prev: State) => State)(
        instance[USV]![currentIndex].value as State
      )
    } else if (isRef(newState)) {
      instance[USV]![currentIndex] = newState
    } else {
      instance[USV]![currentIndex].value = newState
    }
  }

  instance[USI]++
  return [state as Ref<State>, setState]
}
