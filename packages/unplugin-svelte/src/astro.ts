import type { Options } from './types'

import unplugin from '.'

// eslint-disable-next-line unicorn/no-anonymous-default-export
export default (options: Options) => ({
  name: 'unplugin-starter',
  hooks: {
    // eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-explicit-any
    'astro:config:setup': async (astro: any): Promise<void> => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      astro.config.vite.plugins ||= []
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      astro.config.vite.plugins.push(unplugin.vite(options))
    }
  }
})
