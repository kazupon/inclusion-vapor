import { parse } from 'svelte/compiler'
import { describe, expect, test } from 'vitest'
import { enableStructures, findAttrs, isSvelteElement, isSvelteText } from '../ir/index.ts'
import { SvelteStylesheet } from './stylesheet.ts'

import type { SvelteAttribute, SvelteElement, SvelteTemplateNode, SvelteText } from '../ir/index.ts'

// TODO: add more tests from svelte4 test cases (`packages/svelte/test/css/samples`)

const code = `
<script>
	let count = 0
	let bold = 1
	let increment
	let header
</script>

<h1 class:header class="count">Header</h1>
<button class="count" on:click={increment}>
  count is {count}
</button>
<p class="count"><span class={bold}>count</span> <span>is</span> {count}</p>
<div></div>
<footer id="footer">Footer</footer>

<style>
  .count {
    color: red;
  }
  span {
    color: blue;
  }
  #footer {
    color: green;
  }
</style>
`

function walk(
  node: SvelteTemplateNode,
  {
    enter,
    leave
  }: { enter?: (node: SvelteTemplateNode) => void; leave?: (node: SvelteTemplateNode) => void }
) {
  enter?.(node)
  if (node.children) {
    for (const child of node.children) {
      walk(child, { enter, leave })
    }
  }
  leave?.(node)
}

function findTexts(attr: SvelteAttribute): SvelteText[] {
  // eslint-disable-next-line unicorn/no-array-callback-reference
  return Array.isArray(attr.value) ? attr.value.filter(isSvelteText) : []
}

describe('apply & reify', () => {
  test('basic style usages', () => {
    const svelteAst = parse(code)
    const stylesheet = new SvelteStylesheet({ ast: svelteAst.css!, source: code })
    enableStructures(svelteAst.html)
    const stack: SvelteElement[] = []
    walk(svelteAst.html, {
      enter(node) {
        if (isSvelteElement(node)) {
          stylesheet.apply(node, true)
          stack.push(node)
        }
      }
    })

    stylesheet.reify()

    // footer#footer
    const footer = stack.pop()!
    const footerAttr = findAttrs(footer, 'class')!
    const footerTexts = findTexts(footerAttr)
    expect(footerTexts.length).toEqual(1)
    expect(footerTexts[0].data).toEqual(stylesheet.id)

    // div
    const div = stack.pop()!
    const divAttr = findAttrs(div, 'class')
    expect(divAttr).toBeUndefined()

    // span
    const span = stack.pop()!
    // console.log('span', span)
    const spanAttr = findAttrs(span, 'class')!
    const spanTexts = findTexts(spanAttr)
    expect(spanTexts.length).toEqual(1)
    expect(spanTexts[0].data).toEqual(stylesheet.id)

    // span color={bold}
    const spanBold = stack.pop()!
    // console.log('spanBold', spanBold)
    const spanBoldAttr = findAttrs(spanBold, 'class')!
    const spanBoldTexts = findTexts(spanBoldAttr)
    expect(spanBoldTexts.length).toEqual(1)
    expect(spanBoldTexts[0].data).toEqual(` ${stylesheet.id}`)

    // p class="count"
    const p = stack.pop()!
    // console.log('p', p)
    const pAttr = findAttrs(p, 'class')!
    const pTexts = findTexts(pAttr)
    expect(pTexts.length).toEqual(1)
    expect(pTexts[0].data).toEqual(`count ${stylesheet.id}`)

    // button class="count"
    const button = stack.pop()!
    // console.log('button', button)
    const buttonAttr = findAttrs(button, 'class')!
    const buttonTexts = findTexts(buttonAttr)
    expect(buttonTexts.length).toEqual(1)
    expect(buttonTexts[0].data).toEqual(`count ${stylesheet.id}`)

    // h1 class:header class="count"
    const h1 = stack.pop()!
    const h1Attr = findAttrs(h1, 'class')!
    const h1Texts = findTexts(h1Attr)
    expect(h1Texts.length).toEqual(1)
    expect(h1Texts[0].data).toEqual(`count ${stylesheet.id}`)
  })
})

describe('render', () => {
  test('basic', () => {
    const svelteAst = parse(code)
    const stylesheet = new SvelteStylesheet({ ast: svelteAst.css!, source: code })
    enableStructures(svelteAst.html)
    walk(svelteAst.html, {
      enter(node) {
        if (isSvelteElement(node)) {
          stylesheet.apply(node)
        }
      }
    })
    stylesheet.reify()

    const { id } = stylesheet
    const { code: c } = stylesheet.render('foo.css')
    expect(c).toEqual(`.count.${id}{color:red}span.${id}{color:blue}#footer.${id}{color:green}`)
  })
})
