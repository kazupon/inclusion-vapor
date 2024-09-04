import { expect, test } from 'vitest'

test.todo('basic', () => {
  const source = `{#if ok}
  <div>{msg}</div>
{/if}`
  expect(source).toBe('todo')
})

test.todo('dedupe same template', () => {
  const source = `{#if ok}
  <div>{msg}</div>
{/if}
{#if ok}
  <div>{msg}</div>
{/if}`
  expect(source).toBe('todo')
})

test.todo('#if + :else', () => {
  const source = `{#if ok}
  <div></div>
{:else}
  <p></p>
{/if}`
  expect(source).toBe('todo')
})

test.todo('#if + :else-if', () => {
  const source = `{#if ok}
  <div></div>
{:else if orNot}
  <p></p>
{/if}`
  expect(source).toBe('todo')
})

test.todo('#if + :else-if + :else', () => {
  const source = `{#if ok}
  <div></div>
{:else if orNot}
  <p></p>
{:else}
  <template>fine</template>
{/if}`
  expect(source).toBe('todo')
})

test.todo('comment between blocks', () => {
  const source = `{#if ok}
  <div></div>
  <!-- foo -->
{:else if orNot}
  <!-- bar -->
  <p></p>
{:else}
  <template>fine</template>
{/if}`
  expect(source).toBe('todo')
})

test.todo('component #if', () => {
  const source = `{#if ok}
  <MyComponent />
{/if}`
  expect(source).toBe('todo')
})
