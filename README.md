# Inclusion Vapor

This Resarch & Development project is for running various components in [vapor](https://github.com/vuejs/core-vapor).

This project try to work **whether interoperability can be provided between components of different frameworks on vapor**.

> [!WARNING]
> This is WIP 👷

## 🚂 Current working status:

- Svelte
- React (WIP)

## 🍭 Playground

```sh
pnpm build # build the packages
pnpm play # start playground
```

## react-vapor

WIP:

## svelte-vapor

Svelte based on v4 (v3)

- [Svelte Vapor Template Explorer](https://svelte-vapor-template-explorer.netlify.app)

### ✅ TODO

svelte-vapor

<details>

- [ ] transform
  - [x] NodeTransform
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
  - [ ] `{#if}` / `{:else}` / `{:else if}`
  - [ ] `{#each}`
  - [ ] `{#await}`
  - [ ] `{#key}`
- [ ] Special tags
  - [ ] `{@html}`
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
- [ ] WIP: SFC-flavoured component compiler
  - [ ] template
  - [ ] script
  - [ ] styles
- [ ] WIP: Vite plugin with unplugin
- [x] Counter App
  - [x] simple bindings
  - [x] simple events
- [ ] Repl
- [ ] TODO-MVC App

</details>

## ©️ License

[MIT](http://opensource.org/licenses/MIT)
