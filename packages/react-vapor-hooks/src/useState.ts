import type { SetStateAction, Dispatch } from 'react'

export function useState<S = undefined>(
  initialState?: S | (() => S)
): [S, Dispatch<SetStateAction<S>>] {
  // TODO: implement useState

  function setState(newState: S | ((prev: S) => S)): void {
    console.log('setState', newState)
  }

  return [initialState as S, setState]
}
