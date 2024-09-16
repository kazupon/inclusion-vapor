# Inclusion Vapor

This Research & Development project is for running various components in [vapor](https://github.com/vuejs/core-vapor).

> [!WARNING]
> This is WIP 👷, so don't use in production

This project try to work **whether interoperability can be provided between components of different frameworks on vapor**.

![inclusion-vapor](./assets/inclusion-vapor-v0.png)

## 🚂 Current working status:

- react-vapor (PoC Done): react for vapor
- svelte-vapor (PoC Done): svelte for vapor

## 🍭 Playground

```sh
pnpm build # build the packages
pnpm play # start playground
```

## ⚛️ react-vapor

Based on React v18 latest

- [Jsx Vapor Explorer](https://jsx-vapor-explorer.netlify.app/)

## 🎩 svelte-vapor

Based on Svelte v4 (maybe v3 compatible)

- [Svelte Vapor Template Explorer](https://svelte-vapor-template-explorer.netlify.app)

## ✅ TODO

### react-vapor

<details>

- [ ] transform for jsx
  - [x] NodeTransform
  - [ ] WIP: DirectiveTransform
- [ ] hooks
  - [ ] useActionState
  - [ ] useCallback
  - [ ] useContext
  - [ ] useDebugValue
  - [ ] useDefferdValue
  - [ ] useEffect
  - [ ] useId
  - [ ] useImperativeHandle
  - [ ] useInsertionEffect
  - [ ] useLayoutEffect
  - [ ] useMemo
  - [ ] useOptimistic
  - [ ] useReducer
  - [ ] useRef
  - [x] useState
  - [ ] useSyncExternalStore
  - [ ] useTransition
- [ ] Components
  - [ ] `<Fragments>`
  - [ ] `<Profiler>`
  - [ ] `<StrictMode>`
  - [ ] `<Suspense>`
  - [ ] Server components
- [ ] APIs
  - [ ] act
  - [ ] cache
  - [ ] createContext
  - [ ] forwardRef
  - [ ] lazy
  - [ ] memo
  - [ ] startTransition
  - [ ] use
  - [ ] experimental_taintObjectReference
  - [ ] experimental_taintUniqueValue
- [x] Template Explorer
- [x] Vite plugin with unplugin
- [x] Counter App
  - [x] simple bindings
  - [x] simple events
- [ ] Repl
- [ ] TODO-MVC App

</details>

### svelte-vapor

<details>

- [ ] transform
  - [ ] WIP: NodeTransform
  - [ ] WIP: DirectiveTransform
- [ ] Svelte Component
  - [x] prop
  - [x] attrs
  - [ ] prop export
  - [ ] `$$props`
  - [ ] `$$restProps`
  - [ ] `$`
  - [ ] `context="module"`
- [ ] Logic blocks
  - [x] `{#if}` / `{:else}` / `{:else if}`
  - [x] `{#each}`
  - [ ] `{#await}`
  - [ ] `{#key}`
- [ ] Special tags
  - [x] `{@html}`
  - [ ] `{@debug}`
  - [ ] `{@const}`
- [ ] Element directives
  - [x] `on:eventname`
  - [ ] `bind:property`
  - [ ] Binding `<select>` value
  - [ ] Media element bindings
  - [ ] Image element bindings
  - [ ] Block-level element bindings
  - [ ] `bind:group`
  - [ ] `bind:this`
  - [ ] `class:name`
  - [ ] `style:property`
  - [ ] `use:action`
  - [ ] `transition:fn`
  - [ ] Transition parameters
  - [ ] Custom transition functinos
  - [ ] Transition events
  - [ ] `in:fn/out:fn`
  - [ ] `animate:fn`
  - [ ] Animation Parameters
  - [ ] Custom animation functions
- [ ] Component directives
  - [x] `on:eventname`
  - [ ] `--style-props`
  - [ ] `bind:property`
  - [ ] `bind:this`
- [ ] Special elements
  - [ ] `<slot>`
    - [ ] default
    - [ ] `<slot name="name">`
    - [ ] `$$slots`
    - [ ] `<slot key={value}>`
  - [ ] `<svelte:self>`
  - [ ] `<svelte:component>`
  - [ ] `<svelte:element>`
  - [ ] `<svelte:window>`
  - [ ] `<svelte:document>`
  - [ ] `<svelte:body>`
  - [ ] `<svelte:head>`
  - [ ] `<svelte:options>`
  - [ ] `<svelte:fragment>`
- [ ] Runtime
  - [ ] svelte
    - [ ] `onMount`
    - [ ] `beforeUpdate`
    - [ ] `afterUpdate`
    - [ ] `onDestroy`
    - [ ] `tick`
    - [ ] `setContext`
    - [ ] `getContext`
    - [ ] `hasContext`
    - [ ] `getAllContext`
    - [ ] `createEventDispatcher`
    - [ ] `Types`
  - [ ] store
  - [ ] motion
  - [ ] transition
  - [ ] animate
  - [ ] eashing
  - [ ] action
- [x] Template Explorer
- [ ] WIP(PoC Done): SFC-flavoured component compiler
  - [ ] template
  - [ ] script
  - [ ] styles
- [ ] WIP(Poc Done): Vite plugin with unplugin
- [x] Counter App
  - [x] simple bindings
  - [x] simple events
- [ ] Repl
- [ ] TODO-MVC App

</details>

## 💖 Credits

This project is supported by:

- [Vue.js & Vapor](https://github.com/vuejs/core-vapor), created by [Evan You](https://github.com/yyx990803) and [Vapor team](https://github.com/orgs/vuejs/teams/vapor)
- [React](https://react.dev/), created by Meta Platforms, Inc, and affiliates.
- [Svelte](https://svelte.dev/), created by [Rich Harris](https://github.com/Rich-Harris) and Svelte community

And Inspired by:

- [unplugin-vue-jsx-vapor](https://github.com/unplugin/unplugin-vue-jsx-vapor), created by [zhiyuanzmj](https://github.com/zhiyuanzmj)
- [vue-hooks](https://github.com/Ubugeeei/vue-hooks), created by [Ubugeeei](https://github.com/Ubugeeei)

Thank you! ❤️

## ©️ License

[MIT](http://opensource.org/licenses/MIT)
