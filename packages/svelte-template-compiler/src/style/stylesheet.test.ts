import { parse } from 'svelte/compiler'
import { test } from 'vitest'
import { IRNodeTypes, enableStructures } from '../ir/index.ts'
import { getBaseTransformPreset, transform } from '../transform.ts'
import { SvelteStylesheet } from './stylesheet.ts'

import type { RootNode, SvelteElement } from '../ir/index.ts'

const code = `
<script>
  let count = 0
  const increment = () => {
    count += 1
  }
</script>

<button class="count" on:click={increment}>
  count is {count}
</button>

<style>
  .count {
    color: red;
  }
</style>
`

test('basic', () => {
  const svelteAst = parse(code)
  enableStructures(svelteAst.html)
  const ast: RootNode = {
    ...svelteAst.html,
    type: IRNodeTypes.ROOT,
    children: svelteAst.html.children || [],
    source: code,
    components: [],
    directives: [],
    helpers: new Set(),
    temps: 0
  }

  const [nodeTransforms, directiveTransforms] = getBaseTransformPreset(false)
  transform(ast, {
    nodeTransforms,
    directiveTransforms,
    css: svelteAst.css,
    scopedStyleApplyer: (node, context) => {
      const stylesheet = new SvelteStylesheet(context.options.css)
      stylesheet.apply(node as SvelteElement)
      console.log('applyScopedStyle', stylesheet)
    }
  })
})
