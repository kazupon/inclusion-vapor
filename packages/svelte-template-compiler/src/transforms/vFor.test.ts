import { test } from 'vitest'

test.todo('basic', () => {
  const _source = `{#each items as item (item.id)}
  <div on:click={remove(item)}>{item.name}</div>
{/each}`
})

test.todo('multi effect', () => {
  const _source = `{#each items as item, index (item.id)}
  <div on:click={remove(item)} item={item} {index}>{item.name}</div>
{/each}`
})

test.todo('object de-structured value', () => {
  const _source = `{#each items as { name, id }, index (item.id)}
  <span>{name}{id}</span>
{/each}`
})

test.todo('nested #each', () => {
  const _source = `{#each items as item, i (item.id)}
  <div>
  {#each item.children as child, j}
    <span>{ i + j }</span>
  {/each}
  </div>
{/each}`
})

test.todo('object spread value', () => {
  const _source = `{#each items as { id, ...other }}
  <span>{name}{id}</span>
{/each}`
})

test.todo('array spread value', () => {
  const _source = `{#each [...items] as { name, id }}
  <div>{name}{id}</div>
{/each}`
})

test.todo('complex expressions', () => {
  const _source = `{#each list as { foo = bar, baz: [qux = quux] }}
  <div>{ foo + bar + baz + qux + quux }</div>
{/each}`
})

test.todo('prefixIdentifiers: false', () => {
  const _source = `{#each items as item (item.id)}
  <div on:click={remove(item)}>{item.name}</div>
{/each}`
})
