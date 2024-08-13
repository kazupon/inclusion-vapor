export interface Options {
  include?: string | RegExp | (string | RegExp)[]
  exclude?: string | RegExp | (string | RegExp)[]
  // TODO: we shouldl add more `vite-plugin-svelte` options
}
