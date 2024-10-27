<script>
  import { createEventDispatcher, onMount } from 'svelte'
  import { writable } from 'svelte/store'

  let count = writable(0)
  const dispatch = createEventDispatcher()

  onMount(() => {
    console.log('Svelte Vapor component mounted', $count)
  })

  function increment(e) {
    console.log('increment svelte', e)
    count.set($count + 1)
    dispatch('increment', { count: $count })
  }
</script>

<div class="box" id="svelte">
  <button on:click={increment}>
    Svelte Vapor count is {$count}
  </button>
  <br />
  <slot></slot>
</div>
