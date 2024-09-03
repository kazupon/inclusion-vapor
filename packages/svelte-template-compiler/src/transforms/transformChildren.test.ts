import { compile as vaporCompile } from '@vue-vapor/compiler-vapor'
import { describe, expect, test } from 'vitest'
import { makeCompile } from './_utils.ts'
import { transformChildren } from './transformChildren.ts'
import { transformElement } from './transformElement.ts'
import { transformText } from './transformText.ts'

const compile = makeCompile({
  prefixIdentifiers: false,
  nodeTransforms: [transformText, transformElement, transformChildren]
})

describe('compiler: children transform', () => {
  test.todo('basic')

  test('native elements', () => {
    const source = `<div>
  <div>
    <p>Hello</p>
  </div>
  <p>World</p>
</div>`
    const { ir: _, code, vaporHelpers } = compile(source)
    const expectedResult = vaporCompile(source)
    expect(code).toMatchSnapshot('received')
    expect(expectedResult.code).toMatchSnapshot('expected')
    // NOTE:
    // There are differences in the handling around spaces and line breaks between Vue compiler and Svelte compiler.
    // about details, see the snapshot
    // expect(code).toEqual(expectedResult.code)
    expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)
  })

  test('sibling references', () => {
    const source1 = `<div>
  <p>{ first }</p>
  { second }
  { third }
  <p>{ forth }</p>
</div>`
    const { ir: _, code, vaporHelpers } = compile(source1)
    const source2 = `<div>
  <p>{{ first }}</p>
  {{ second }}
  {{ third }}
  <p>{{ forth }}</p>
</div>`
    const expectedResult = vaporCompile(source2)
    expect(code).toMatchSnapshot('received')
    expect(expectedResult.code).toMatchSnapshot('expected')
    expect(code).toEqual(expectedResult.code)
    expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)
  })

  test('components', () => {
    const source = `<div>
  <Foo></Foo>
</div>`
    const { ir: _, code, vaporHelpers } = compile(source)
    const expectedResult = vaporCompile(source)
    expect(code).toMatchSnapshot('received')
    expect(expectedResult.code).toMatchSnapshot('expected')
    expect(code).toEqual(expectedResult.code)
    expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)
  })

  test.todo('components has slots with native elements')
  test.todo('components has slots with mustache')
})
