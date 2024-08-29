import { vi, test, expect } from 'vitest'
import { parse } from '@babel/parser'
import { IRNodeTypes } from './ir'
import { transform } from './transform'

import type { RootNode, JSXElement, JSXFragment } from './ir'

function getRootNodeAst(source: string): RootNode {
  const {
    body: [statement]
  } = parse(source, {
    sourceType: 'module',
    plugins: ['jsx']
  }).program
  let children!: JSXElement[] | JSXFragment['children']
  if (statement.type === 'ExpressionStatement') {
    children =
      statement.expression.type === 'JSXFragment'
        ? statement.expression.children
        : statement.expression.type === 'JSXElement'
          ? [statement.expression]
          : []
  }

  return {
    type: IRNodeTypes.ROOT,
    children,
    source,
    components: [],
    directives: [],
    helpers: new Set(),
    temps: 0
  }
}

test('transform', () => {
  const ast = getRootNodeAst(`(
<button onClick={handleIncrement}>
  count is {counter}
</button>
)`)

  const afterTransform1 = vi.fn()
  const nodeTransform1 = vi.fn().mockImplementation(() => afterTransform1)
  const _ir = transform(ast, {
    nodeTransforms: [nodeTransform1]
  })
  expect(nodeTransform1).toHaveBeenCalled()
  expect(afterTransform1).toHaveBeenCalled()
})
