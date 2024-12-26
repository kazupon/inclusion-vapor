<script context="module">
  export let c = 0
  export let foo = `foo${c}`
  console.log('script context', foo.toString())

  export function counter() {
    foo = `foo${c++}`
    console.log('script content : foo', foo)
  }
</script>

<script>
  import { createEventDispatcher, onMount } from 'svelte'
  import { writable } from 'svelte/store'

  export const msg = 'counter value from vue'
  let count = 0
  const store = writable(count)
  const dispatch = createEventDispatcher()

  onMount(() => {
    console.log('Svelte Vapor component mounted', count)
  })

  $: double = count * 2
  $: {
    console.log('count', count)
    console.log('double', double)
    store.set(count)
  }

  function increment(e) {
    console.log('increment svelte', e)
    count++
    dispatch('increment', { count: count })
  }
</script>

<div class="box" id="svelte">
  <button on:click={increment}>
    Svelte Vapor count is {count}
  </button>
  <br />
  <span>script module value: {foo}</span>
  <br />
  <span>Prop msg: {msg}</span>
  <br />
  <span>Double: {double}</span>
  <br />
  <span>Store: {$store}</span>
  <br />
  <slot></slot>
</div>

<style>
  span {
    color: #ff3e00;
  }
</style>
