<script>
let count = 0
const increment = () => {
  count += 1
}
</script>

<div class="card">
  <button on:click={increment}>
    Svelte Vapor count is {count}
  </button>
</div>
