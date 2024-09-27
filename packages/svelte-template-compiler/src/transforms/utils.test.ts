import { parse } from 'svelte/compiler'
import { describe, expect, test } from 'vitest'
import { isNonWhitespaceContent } from './utils.ts'

import type { SvelteTemplateNode } from '../ir/index.ts'

export function getSvelteTemplateNode(code: string): SvelteTemplateNode | null {
  const ast = parse(code)
  if (ast.html.children == undefined || ast.html.children.length === 0) {
    return null // eslint-disable-line unicorn/no-null
  }
  return ast.html.children[0]
}

describe('isNonWhitespaceContent', () => {
  test('has text', () => {
    const el = getSvelteTemplateNode('hello')
    expect(isNonWhitespaceContent(el!)).toBe(true)
  })

  test('has no text', () => {
    const el = getSvelteTemplateNode('<div></div>')
    expect(isNonWhitespaceContent(el!)).toBe(true)
  })

  test('has text with whitespace only', () => {
    const el = getSvelteTemplateNode(' ')
    expect(isNonWhitespaceContent(el!)).toBe(true)
  })

  test('has text with whitespace', () => {
    const el = getSvelteTemplateNode(' hello ')
    expect(isNonWhitespaceContent(el!)).toBe(true)
  })

  test('has text with break line', () => {
    const el = getSvelteTemplateNode(`
  hello
   `)
    expect(isNonWhitespaceContent(el!)).toBe(true)
  })

  test('has text complex', () => {
    const source = `<div>
    test is <span>complex</span>
</div>
`
    const el = getSvelteTemplateNode(source)
    expect(isNonWhitespaceContent(el!)).toBe(true)
  })

  test('has comments', () => {
    const el = getSvelteTemplateNode('<div><!-- comment --></div>')
    expect(isNonWhitespaceContent(el!)).toBe(true)
  })
})
