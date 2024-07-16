import { describe, expect, test } from 'vitest'
import { makeCompile } from './_utils'
import { transformElement } from './transformElement'
import { transformChildren } from './transformChildren'

const compileWithTransform = makeCompile({
  nodeTransforms: [transformChildren, transformElement]
})

describe('Svelete Attribute Node', () => {
  test('native elements', () => {
    const { ir, code, vaporHelpers } = compileWithTransform(
      `<div class="container">
        <div class="header">
          <p style="color: red;">Hello</p>
          <img src="foo.jpg" width="500" height="600">
          <form action="/submit" method="post">
            <input type="text" />
            <input type="submit">
          </form>
        </div>
      </div>`
    )
    expect(code).toMatchSnapshot()
    expect(ir).toMatchSnapshot()
    expect(vaporHelpers).toMatchSnapshot()
  })

  test('components', () => {
    const { ir, code, vaporHelpers } = compileWithTransform(
      `<div class="container">
        <Foo class="foo">
        </Foo>
        <Bar bar="1">
          <Baz />
        </Bar>
      </div>`
    )
    expect(code).toMatchSnapshot()
    expect(ir).toMatchSnapshot()
    expect(vaporHelpers).toMatchSnapshot()
  })
})
