import { createApp, h, reactive, ref } from 'vue'

import type { Ref } from 'vue'
import type { CompilerOptions } from 'packages/template-compiler/src'

export const ssrMode: Ref<boolean> = ref(false)
// export const vaporMode: Ref<boolean> = ref(true)

export const defaultOptions: CompilerOptions = {
  mode: 'module',
  filename: 'Foo.svelte',
  prefixIdentifiers: false,
  hoistStatic: false,
  cacheHandlers: false,
  scopeId: null, // eslint-disable-line unicorn/no-null
  inline: false,
  ssrCssVars: `{ color }`,
  whitespace: 'condense'
}

export const compilerOptions: CompilerOptions = reactive(Object.assign({}, defaultOptions))

const COMMIT = __COMMIT__

const App = {
  setup() {
    return () => {
      const isSSR = ssrMode.value
      const isModule = compilerOptions.mode === 'module'
      const usePrefix = compilerOptions.prefixIdentifiers || compilerOptions.mode === 'module'

      return [
        h('h1', `Svelte Vapor Template Explorer`),
        h(
          'a',
          {
            href: `https://github.com/kazupon/svelte-vapor/tree/${COMMIT}`,
            target: `_blank`
          },
          `@${COMMIT}`
        ),
        ' | ',
        h(
          'a',
          {
            href: 'https://app.netlify.com/sites/svelte-vapor-template-explorer/deploys',
            target: `_blank`
          },
          'History'
        ),

        h('div', { id: 'options-wrapper' }, [
          h('div', { id: 'options-label' }, 'Options ↘'),
          h('ul', { id: 'options' }, [
            // mode selection
            h('li', { id: 'mode' }, [
              h('span', { class: 'label' }, 'Mode: '),
              h('input', {
                type: 'radio',
                id: 'mode-module',
                name: 'mode',
                checked: isModule,
                onChange() {
                  compilerOptions.mode = 'module'
                }
              }),
              h('label', { for: 'mode-module' }, 'module'),
              ' ',
              h('input', {
                type: 'radio',
                id: 'mode-function',
                name: 'mode',
                checked: !isModule,
                onChange() {
                  compilerOptions.mode = 'function'
                }
              }),
              h('label', { for: 'mode-function' }, 'function')
            ]),

            // whitespace handling
            h('li', { id: 'whitespace' }, [
              h('span', { class: 'label' }, 'whitespace: '),
              h('input', {
                type: 'radio',
                id: 'whitespace-condense',
                name: 'whitespace',
                checked: compilerOptions.whitespace === 'condense',
                onChange() {
                  compilerOptions.whitespace = 'condense'
                }
              }),
              h('label', { for: 'whitespace-condense' }, 'condense'),
              ' ',
              h('input', {
                type: 'radio',
                id: 'whitespace-preserve',
                name: 'whitespace',
                checked: compilerOptions.whitespace === 'preserve',
                onChange() {
                  compilerOptions.whitespace = 'preserve'
                }
              }),
              h('label', { for: 'whitespace-preserve' }, 'preserve')
            ]),

            // SSR
            h('li', [
              h('input', {
                type: 'checkbox',
                id: 'ssr',
                name: 'ssr',
                checked: ssrMode.value,
                onChange(e: Event) {
                  ssrMode.value = (e.target as HTMLInputElement).checked
                }
              }),
              h('label', { for: 'ssr' }, 'SSR')
            ]),

            // toggle prefixIdentifiers
            h('li', [
              h('input', {
                type: 'checkbox',
                id: 'prefix',
                disabled: isModule || isSSR,
                checked: usePrefix || isSSR,
                onChange(e: Event) {
                  compilerOptions.prefixIdentifiers =
                    (e.target as HTMLInputElement).checked || isModule
                }
              }),
              h('label', { for: 'prefix' }, 'prefixIdentifiers')
            ]),

            // toggle hoistStatic
            h('li', [
              h('input', {
                type: 'checkbox',
                id: 'hoist',
                checked: compilerOptions.hoistStatic && !isSSR,
                disabled: isSSR,
                onChange(e: Event) {
                  compilerOptions.hoistStatic = (e.target as HTMLInputElement).checked
                }
              }),
              h('label', { for: 'hoist' }, 'hoistStatic')
            ]),

            // toggle cacheHandlers
            h('li', [
              h('input', {
                type: 'checkbox',
                id: 'cache',
                checked: usePrefix && compilerOptions.cacheHandlers && !isSSR,
                disabled: !usePrefix || isSSR,
                onChange(e: Event) {
                  compilerOptions.cacheHandlers = (e.target as HTMLInputElement).checked
                }
              }),
              h('label', { for: 'cache' }, 'cacheHandlers')
            ]),

            // toggle scopeId
            h('li', [
              h('input', {
                type: 'checkbox',
                id: 'scope-id',
                disabled: !isModule,
                checked: isModule && compilerOptions.scopeId,
                onChange(e: Event) {
                  compilerOptions.scopeId =
                    isModule && (e.target as HTMLInputElement).checked ? 'scope-id' : null // eslint-disable-line unicorn/no-null
                }
              }),
              h('label', { for: 'scope-id' }, 'scopeId')
            ]),

            // inline mode
            h('li', [
              h('input', {
                type: 'checkbox',
                id: 'inline',
                checked: compilerOptions.inline,
                onChange(e: Event) {
                  compilerOptions.inline = (e.target as HTMLInputElement).checked
                }
              }),
              h('label', { for: 'inline' }, 'inline')
            ])

            // compat mode
            // h('li', [
            //   h('input', {
            //     type: 'checkbox',
            //     id: 'compat',
            //     checked: compilerOptions.compatConfig!.MODE === 2,
            //     onChange(e: Event) {
            //       compilerOptions.compatConfig!.MODE = (e.target as HTMLInputElement).checked
            //         ? 2
            //         : 3
            //     }
            //   }),
            //   h('label', { for: 'compat' }, 'v2 compat mode')
            // ]),

            // h('li', [
            //   h('input', {
            //     type: 'checkbox',
            //     id: 'vapor',
            //     checked: vaporMode.value,
            //     onChange(e: Event) {
            //       vaporMode.value = (e.target as HTMLInputElement).checked
            //     }
            //   }),
            //   h('label', { for: 'vapor' }, 'vapor')
            // ])
          ])
        ])
      ]
    }
  }
}

export function initOptions(): void {
  createApp(App).mount(document.querySelector('#header')!)
}
