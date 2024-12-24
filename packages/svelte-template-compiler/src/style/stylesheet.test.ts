import { promises as fs, constants as FS_CONSTANTS } from 'node:fs'
import path from 'node:path'
import { parse } from 'svelte/compiler'
import { describe, expect, it, test } from 'vitest'
import {
  enableStructures,
  findAttrs,
  isSvelteEachBlock,
  isSvelteElement,
  isSvelteElseBlock,
  isSvelteIfBlock,
  isSvelteText
} from '../ir/index.ts'
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
  if ((isSvelteIfBlock(node) || isSvelteEachBlock(node)) && isSvelteElseBlock(node.else)) {
    walk(node.else, { enter, leave })
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

// const __filename = new URL(import.meta.url).pathname
// const __filename = import.meta.filename;
const __dirname = path.dirname(__filename) // eslint-disable-line unicorn/prefer-module
// const __dirname = import.meta.dirname;
const fixturesDir = path.resolve(__dirname, '../../test/fixtures')

function replaceCssHash(str: string): string {
  // eslint-disable-next-line unicorn/prefer-string-replace-all, unicorn/better-regex
  return str.replace(/svelte-[a-z0-9]+/g, 'svelte-xyz')
}

export async function isExist(filepath: string): Promise<boolean> {
  try {
    await fs.access(filepath, FS_CONSTANTS.F_OK)
    return true
  } catch {
    return false
  }
}

async function tryLoadConfig(path: string): Promise<Record<string, unknown>> {
  if (!(await isExist(path))) {
    return {}
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const resolved = await import(path)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
  return resolved.default || resolved
}

describe('render with fixtures', async () => {
  for (const dir of await fs.readdir(fixturesDir)) {
    const skip = /\.skip/.test(dir)
    const only = /\.only/.test(dir)
    const test = only ? it.only : skip ? it.skip : it
    test(dir, async () => {
      const cwd = `${fixturesDir}/${dir}`
      const config = await tryLoadConfig(`${cwd}/config.js`)

      const filename = `${cwd}/input.svelte`
      const _input = await fs.readFile(filename, 'utf8')
      const input = _input.replace(/\s+$/, '').replace(/\r/g, '') // eslint-disable-line unicorn/prefer-string-replace-all
      const _expected = await fs.readFile(`${cwd}/expected.css`, 'utf8')
      const expected = _expected.replace(/\s+$/, '').replace(/\r/g, '') // eslint-disable-line unicorn/prefer-string-replace-all

      const ast = parse(input)
      enableStructures(ast.html)
      const stylesheet = new SvelteStylesheet(
        Object.assign({}, { ast: ast.css!, source: input }, config.compilerOptions || {})
      )
      walk(ast.html, {
        enter(node) {
          if (isSvelteElement(node)) {
            stylesheet.apply(node)
          }
        }
      })
      stylesheet.reify()
      // stylesheet.warnOnUnusedSelectors()

      const rendered = stylesheet.render(filename)
      const actual = replaceCssHash(rendered.code)
      await fs.writeFile(`${cwd}/_actual.css`, actual)

      expect(actual).toEqual(expected)
    })
  }
})
