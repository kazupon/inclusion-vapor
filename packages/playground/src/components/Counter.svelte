<script>
  import { createEventDispatcher, onMount } from 'svelte'
  import { writable } from 'svelte/store'

  let count = 1
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
  <span>Double: {double}</span>
  <br />
  <span>Store: {$store}</span>
  <br />
  <slot></slot>
</div>
