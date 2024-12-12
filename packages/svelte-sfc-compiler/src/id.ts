export const PREFIX = 'data-v-'

export function getShortId(id: string, prefix: string = PREFIX): string {
  return id.replace(prefix, '')
}

export const generate = (target: string, prefix: string = PREFIX): string => `${prefix}${target}`
