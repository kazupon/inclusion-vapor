import type { ComponentInternalInstance, Ref } from 'vue/vapor'

export const USI: unique symbol = Symbol() // index key for `useState` value
export const USV: unique symbol = Symbol() // key for `useState` value

declare module 'vue/vapor' {
  export interface ComponentInternalInstance {
    // for `useState` hook
    [USI]?: number
    [USV]?: Ref<unknown>[]
  }
}

export function resetIndexes(instance: ComponentInternalInstance): void {
  instance[USI] = 0
}
