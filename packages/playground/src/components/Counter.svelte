<script>
  import { createEventDispatcher, onMount } from 'svelte'

  let count = 0
  const dispatch = createEventDispatcher()

  onMount(() => {
    console.log('Svelte Vapor component mounted')
  })

  function increment() {
    count += 1
    dispatch('increment', { count: count })
  }
</script>

<div class="box" id="svelte">
  <button on:click={increment}>
    Svelte Vapor count is {count}
  </button>
  <br />
  <slot></slot>
</div>
