const hasWarned: Record<string, boolean> = {}

export function warnOnce(msg: string): void {
  const isNodeProd = typeof process !== 'undefined' && process.env.NODE_ENV === 'production'
  if (!isNodeProd && !__TEST__ && !hasWarned[msg]) {
    hasWarned[msg] = true
    warn(msg)
  }
}

export function warn(msg: string): void {
  console.warn(
    `\u001B[1m\u001B[33m[svelte-vapor-sfc-compiler]\u001B[0m\u001B[33m ${msg}\u001B[0m\n`
  )
}
