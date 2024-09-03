import { test } from 'vitest'

test.todo('basic', () => {
  const _source = `{#if ok}
  <div>{msg}</div>
{/if}`
})

test.todo('dedupe same template', () => {
  const _source = `{#if ok}
  <div>{msg}</div>
{/if}
{#if ok}
  <div>{msg}</div>
{/if}`
})

test.todo('#if + :else', () => {
  const _source = `{#if ok}
  <div></div>
{:else}
  <p></p>
{/if}`
})

test.todo('#if + :else-if', () => {
  const _source = `{#if ok}
  <div></div>
{:else if orNot}
  <p></p>
{/if}`
})

test.todo('#if + :else-if + :else', () => {
  const _source = `{#if ok}
  <div></div>
{:else if orNot}
  <p></p>
{:else}
  <template>fine</template>
{/if}`
})

test.todo('comment between blocks', () => {
  const _source = `{#if ok}
  <div></div>
  <!-- foo -->
{:else if orNot}
  <!-- bar -->
  <p></p>
{:else}
  <template>fine</template>
{/if}`
})

test.todo('component #if', () => {
  const _source = `{#if ok}
  <MyComponent />
{/if}`
})
