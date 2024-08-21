import { getCurrentInstance, shallowRef } from '@vue-vapor/vapor'
import { USI, USV, resetIndexes } from './internal'

import type { SetStateAction, Dispatch } from 'react'
import type { Ref } from '@vue-vapor/vapor'

/**
 * react `useState` hook for vapor
 */
export function useState<State = undefined>(
  initialState?: State | (() => State)
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
  const state = instance[USV][currentIndex] ?? shallowRef(initialState)
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
    } else {
      instance[USV]![currentIndex].value = newState
    }

    resetIndexes(instance)
  }

  return [state as Ref<State>, setState]
}
