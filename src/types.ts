export type Overwrite<T, U> = Pick<T, Exclude<keyof T, keyof U>> &
  Pick<U, Extract<keyof U, keyof T>>
