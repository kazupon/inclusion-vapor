import { expect, test } from 'vitest'

test.todo('implicit default slot', () => {
  const source = `<Comp><div/></Comp>`
  expect(source).toBe('todo')
})

test.todo('default slot on component', () => {
  const source = `<Comp let:foo={ bar }>{ foo + bar }</Comp>`
  expect(source).toBe('todo')
})

test.todo('named slot on component', () => {
  const source = `<Comp slot="named" let:foo={ bar }>{ foo + bar }</Comp>`
  expect(source).toBe('todo')
})

test.todo('dynamically named slot on component', () => {
  const source = `<Comp slot={ named } let:foo={ bar }>{ foo + bar }</Comp>`
  expect(source).toBe('todo')
})

test.todo('named slots with implicit default slot', () => {
  const source = `<Comp><slot name="one">bar</slot></Comp>`
  expect(source).toBe('todo')
})

test('nested slots scoping', () => {
  const source = `<Comp>
  <template let:foo={ foo }>
    <Inner let:bar={ bar }>
      { foo + bar + baz }
    </Inner>
    { foo + bar + baz }
  </template>
</Comp>`
  expect(source).toBe('todo')
})

test('dynamic slots name', () => {
  const source = `<Comp><div slot={ name }>foo</div></Comp>`
  expect(source).toBe('todo')
})

test('dynamic slots name with #each', () => {
  const source = `<Comp>
  {#each items as item}
  <div slot={ item } let:text={ item }>foo</div>
  {/each}
</Comp>`
  expect(source).toBe('todo')
})

test('dynamic slots name with #each and provide absent key', () => {
  const source = `<Comp>
  {#each items as item, index}
  <div slot={ index } let:text={ item }>foo</div>
  {/each}
</Comp>`
  expect(source).toBe('todo')
})

test.todo('dynamic slots name with #if, #else-if, #else', () => {
  const source = ''
  expect(source).toBe('todo')
})
