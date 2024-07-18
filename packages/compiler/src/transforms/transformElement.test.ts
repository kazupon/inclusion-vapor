import { describe, expect, test } from 'vitest'
import { makeCompile } from './_utils'
import { transformElement } from './transformElement'
import { transformChildren } from './transformChildren'
import { compile as vaporCompile } from '@vue-vapor/compiler-vapor'

const compileWithTransform = makeCompile({
  nodeTransforms: [transformElement, transformChildren]
})

describe.skip('Svelte Attribute Node', () => {
  test('native elements', () => {
    const source = `
<div class="container">
  <div class="header">
    <p style="color: red;">Hello</p>
    <img src="foo.jpg" width="500" height="600">
    <form action="/submit" method="post">
      <input type="text" />
      <input type="submit">
    </form>
  </div>
</div>`
    const { ir: _ir, code, vaporHelpers } = compileWithTransform(source)
    const expectedResult = vaporCompile(source)
    expect(code).toMatchSnapshot()
    expect(code).toEqual(expectedResult.code)
    expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)
  })

  test('components', () => {
    const source = `<div class="container">
  <Foo class="foo"></Foo>
</div>`
    const { ir: _ir, code, vaporHelpers } = compileWithTransform(source)
    const expectedResult = vaporCompile(source)
    expect(code).toMatchSnapshot()
    expect(code).toEqual(expectedResult.code)
    expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)
  })
})
