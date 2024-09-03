import { test } from 'vitest'

test.todo('default slot', () => {
  const _source = `<slot />`
})

test.todo('statically named slot', () => {
  const _source = `<slot name="foo" />`
})

test.todo('dynamically named slot', () => {
  const _source = `<slot name={foo} />`
})

test.todo('default slot with props', () => {
  const _source = `<slot foo="bar" baz={qux} foo-bar={fooBar} />`
})

test.todo('statically named slot with props', () => {
  const _source = `<slot name="foo" baz={qux} foo-bar={fooBar} />`
})

test.todo('statically named slot with spread props', () => {
  const _source = `<slot name="foo" {...things} />`
})

test.todo('statically named slot with on:event', () => {
  const _source = `<slot name="foo" on:click/>`
})

test.todo('default slot with fallback', () => {
  const _source = `<slot><div/></slot>`
})

test.todo('named slot with fallback', () => {
  const _source = `<slot name="foo"><div/></slot>`
})

test.todo('default slot with fallback and props', () => {
  const _source = `<slot name={foo} baz={qux}><div/></slot>`
})
