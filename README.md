# 🫶 Inclusion Vapor

Component Interoperability based on vapor

## About this project

This Research & Development project is for running various components in [vapor](https://github.com/vuejs/core-vapor).

This project started with my day job project and was inspired by [vue-jsx, which was announced at VueConf China 2024](https://x.com/OikawaRizumu/status/1808860605560074476).

> [!WARNING]
> This is WIP 👷, so don't use in production

This project try to work **whether interoperability can be provided between components of different frameworks on vapor**.

![inclusion-vapor](./assets/inclusion-vapor-v0.png)

## 🚂 Current working status:

Currently, I’m working on svelte vapor, which is necessary for my day job, so that’s a priority.

- react-vapor (PoC Done): react for vapor
- svelte-vapor (PoC Done): svelte for vapor,

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
  - [x] NodeTransform (Basic implementation done)
  - [x] DirectiveTransform (Basic implementation done)
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
- [ ] Vite plugin with unplugin (PoC done)
  - [ ] analysis dependencies
  - [ ] runtime transform
  - [ ] reactivity transform
- [x] Counter App
  - [x] simple bindings
  - [x] simple events
- [ ] Repl
- [ ] TODO-MVC App

</details>

### svelte-vapor

<details>

- [x] transform
  - [x] NodeTransform
  - [x] DirectiveTransform
- [ ] Svelte Component
  - [x] prop
  - [x] attrs
  - [x] prop export
  - [ ] `$$props`
  - [ ] `$$restProps`
  - [x] `$`
  - [x] `context="module"`
  - [x] style
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
  - [x] `bind:property`
  - [x] Binding `<select>` value
  - [ ] Media element bindings
  - [ ] Image element bindings
  - [ ] Block-level element bindings
  - [x] `bind:group`
  - [x] `bind:this`
  - [x] `class:name` (multiple classes hasn't supported yet)
  - [x] `style:property` (mulple styles, modifier has'nt supported yes)
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
  - [x] `bind:property`
  - [x] `bind:this`
- [ ] Special elements
  - [ ] `<slot>`
    - [x] default
    - [x] `<slot name="name">`
    - [ ] `$$slots`
    - [x] `<slot key={value}>`
  - [ ] `<svelte:self>`
  - [x] `<svelte:component>`
  - [ ] `<svelte:element>`
  - [ ] `<svelte:window>`
  - [ ] `<svelte:document>`
  - [ ] `<svelte:body>`
  - [ ] `<svelte:head>`
  - [ ] `<svelte:options>`
  - [x] `<svelte:fragment>`
- [ ] Runtime
  - [x] svelte
    - [x] `onMount` (not still support return unmount fn)
    - [x] `beforeUpdate`
    - [x] `afterUpdate`
    - [x] `onDestroy` (vapor not still support)
    - [x] `tick`
    - [x] `setContext`
    - [x] `getContext`
    - [x] `hasContext`
    - [x] `getAllContext`
    - [x] `createEventDispatcher`
  - [x] store
  - [ ] motion
  - [ ] transition
  - [ ] animate
  - [ ] eashing
  - [ ] action
- [x] Template Explorer
- [ ] SFC-flavoured component compiler (PoC Done)
  - [ ] template
  - [ ] script
  - [ ] styles
- [ ] Vite plugin with unplugin (PoC Done)
  - [ ] HMR
  - [ ] analysis dependencies
  - [ ] runtime transform
  - [ ] reactivity transform
- [x] Counter App
  - [x] simple bindings
  - [x] simple events
- [ ] Repl
- [ ] TODO-MVC App

</details>

## 🛣️ Roadmap

This is the roadmap for inclusion-vapor. Currently, we are focusing on day job project, so the roadmap only includes svelte-vapor. If needed, we will continue implementing react-vapor, but We hope to develop through contribution of the community.

**This roadmap depends on [vapor project](https://github.com/vuejs/core-vapor) so that the milestones may change.**

### Milestone 1: svelte-vapor basic implementation

- Goal: To be able to use svelte-vapor instead of svelte 3 and 4 **as experimental**
- Key Tasks:
  - [ ] Basic implementation for svelte 3 and 4 features in [day job](https://plaid.co.jp/en/) project (see more task details [here](./README.md#svelte-vapor))
  - [ ] Building with unplugin-svelte
  - [ ] E2E testing (Snapshot consistency) based on svelte 4 testing

### Milestone 2: svelte-vapor advanced implementation

- Goal: To be able to use svelte-vapor instead of svelte 5, 3, and 4
- Key Tasks:
  - [ ] Implementation of svelte 3 and 4 remaining features to make them available for use by external projects
  - [ ] Rust compiler implementation for Svelte template
  - [ ] Implementation for svelte 5 (Support for runes)

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
