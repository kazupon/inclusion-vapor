import { expect, test } from 'vitest'

test.todo('default slot', () => {
  const source = `<slot />`
  expect(source).toBe('todo')
})

test.todo('statically named slot', () => {
  const source = `<slot name="foo" />`
  expect(source).toBe('todo')
})

test.todo('dynamically named slot', () => {
  const source = `<slot name={foo} />`
  expect(source).toBe('todo')
})

test.todo('default slot with props', () => {
  const source = `<slot foo="bar" baz={qux} foo-bar={fooBar} />`
  expect(source).toBe('todo')
})

test.todo('statically named slot with props', () => {
  const source = `<slot name="foo" baz={qux} foo-bar={fooBar} />`
  expect(source).toBe('todo')
})

test.todo('statically named slot with spread props', () => {
  const source = `<slot name="foo" {...things} />`
  expect(source).toBe('todo')
})

test.todo('statically named slot with on:event', () => {
  const source = `<slot name="foo" on:click/>`
  expect(source).toBe('todo')
})

test.todo('default slot with fallback', () => {
  const source = `<slot><div/></slot>`
  expect(source).toBe('todo')
})

test.todo('named slot with fallback', () => {
  const source = `<slot name="foo"><div/></slot>`
  expect(source).toBe('todo')
})

test.todo('default slot with fallback and props', () => {
  const source = `<slot name={foo} baz={qux}><div/></slot>`
  expect(source).toBe('todo')
})
