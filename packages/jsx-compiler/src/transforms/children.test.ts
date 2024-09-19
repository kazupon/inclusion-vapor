import { compile as vaporCompile } from '@vue-vapor/compiler-vapor'
import { describe, expect, test } from 'vitest'
import { makeCompile } from './_utils.ts'
import { transformChildren } from './children.ts'
import { transformElement } from './element.ts'
import { transformText } from './text.ts'

const compile = makeCompile({
  prefixIdentifiers: false,
  nodeTransforms: [transformText, transformElement, transformChildren]
})

describe('compiler: children transform', () => {
  test.todo('basic')

  test('native elements', () => {
    const jsxSource = `(<><div>
  <div>
    <p>Hello</p>
  </div>
  <p>World</p>
</div></>)`
    const vaporSource = `<div>
  <div>
    <p>Hello</p>
  </div>
  <p>World</p>
</div>`
    const { ir: _, code, vaporHelpers } = compile(jsxSource)
    const expectedResult = vaporCompile(vaporSource)
    expect(code).toMatchSnapshot('received')
    expect(expectedResult.code).toMatchSnapshot('expected')
    // NOTE:
    // There are differences in the handling around spaces and line breaks between vue compiler and jsx compiler.
    // about details, see the snapshot
    // expect(code).toEqual(expectedResult.code)
    expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)
  })

  test('sibling references', () => {
    const jsxSource = `(<><div>
  <p>{ first }</p>
  { second }
  { third }
  <p>{ forth }</p>
</div></>)`
    const vaporSource = `<div>
  <p>{{ first }}</p>
  {{ second }}
  {{ third }}
  <p>{{ forth }}</p>
</div>`
    const { ir: _, code, vaporHelpers } = compile(jsxSource)
    const expectedResult = vaporCompile(vaporSource)
    expect(code).toMatchSnapshot('received')
    expect(expectedResult.code).toMatchSnapshot('expected')
    expect(code).toEqual(expectedResult.code)
    expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)
  })

  // TODO: WIP, how should we handle components?
  test('components', () => {
    const jsxSource = `(<><div>
  <Foo></Foo>
</div></>)`
    const vaporSource = `<div>
  <Foo></Foo>
</div>`
    const { ir: _, code, vaporHelpers: __ } = compile(jsxSource)
    const expectedResult = vaporCompile(vaporSource)
    expect(code).toMatchSnapshot('received')
    expect(expectedResult.code).toMatchSnapshot('expected')
    // expect(code).toEqual(expectedResult.code)
    // expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)
  })

  test.todo('components has slots with native elements')
  test.todo('components has slots with mustache')
})
