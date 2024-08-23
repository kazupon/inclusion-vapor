import type { Ref, ComponentInternalInstance } from '@vue-vapor/vapor'

export const USI: unique symbol = Symbol() // index key for `useState` value
export const USV: unique symbol = Symbol() // key for `useState` value

declare module '@vue-vapor/vapor' {
  export interface ComponentInternalInstance {
    // for `useState` hook
    [USI]?: number
    [USV]?: Ref<unknown>[]
  }
}

export function resetIndexes(instance: ComponentInternalInstance): void {
  instance[USI] = 0
}