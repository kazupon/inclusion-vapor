import { expect, test } from 'vitest'

test.todo('basic', () => {
  const source = `{#each items as item (item.id)}
  <div on:click={remove(item)}>{item.name}</div>
{/each}`
  expect(source).toBe('todo')
})

test.todo('multi effect', () => {
  const source = `{#each items as item, index (item.id)}
  <div on:click={remove(item)} item={item} {index}>{item.name}</div>
{/each}`
  expect(source).toBe('todo')
})

test.todo('object de-structured value', () => {
  const source = `{#each items as { name, id }, index (item.id)}
  <span>{name}{id}</span>
{/each}`
  expect(source).toBe('todo')
})

test.todo('nested #each', () => {
  const source = `{#each items as item, i (item.id)}
  <div>
  {#each item.children as child, j}
    <span>{ i + j }</span>
  {/each}
  </div>
{/each}`
  expect(source).toBe('todo')
})

test.todo('object spread value', () => {
  const source = `{#each items as { id, ...other }}
  <span>{name}{id}</span>
{/each}`
  expect(source).toBe('todo')
})

test.todo('array spread value', () => {
  const source = `{#each [...items] as { name, id }}
  <div>{name}{id}</div>
{/each}`
  expect(source).toBe('todo')
})

test.todo('complex expressions', () => {
  const source = `{#each list as { foo = bar, baz: [qux = quux] }}
  <div>{ foo + bar + baz + qux + quux }</div>
{/each}`
  expect(source).toBe('todo')
})

test.todo('prefixIdentifiers: false', () => {
  const source = `{#each items as item (item.id)}
  <div on:click={remove(item)}>{item.name}</div>
{/each}`
  expect(source).toBe('todo')
})
