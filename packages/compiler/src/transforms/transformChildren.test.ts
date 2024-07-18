import { describe, expect, test } from 'vitest'
import { makeCompile } from './_utils'
import { transformChildren } from './transformChildren'
import { transformElement } from './transformElement'
import { transformText } from './transformText'
import { compile as vaporCompile } from '@vue-vapor/compiler-vapor'

const compile = makeCompile({
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
    const { ir: _, code, vaporHelpers: __ } = compile(source)
    const expectedResult = vaporCompile(source)
    expect(code).toMatchSnapshot('recieved')
    expect(expectedResult.code).toMatchSnapshot('expected')
    expect(code).toEqual(expectedResult.code)
    // expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)
  })

  test('sibling references', () => {
    const source1 = `<div>
  <p>{ first }</p>
  { second }
  { third }
  <p>{ forth }</p>
</div>`
    const { ir: _, code, vaporHelpers: __ } = compile(source1)
    const source2 = `<div>
  <p>{{ first }}</p>
  {{ second }}
  {{ third }}
  <p>{{ forth }}</p>
</div>`
    const expectedResult = vaporCompile(source2)
    expect(code).toMatchSnapshot('recieved')
    expect(expectedResult.code).toMatchSnapshot('expected')
    expect(code).toEqual(expectedResult.code)
    // expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)
  })

  test('components', () => {
    const source1 = `<div>
  <Foo></Foo>
</div>`
    const { ir: _, code, vaporHelpers: __ } = compile(source1)
    const source2 = `<div>
  <Foo></Foo>
</div>`
    const expectedResult = vaporCompile(source2)
    expect(code).toMatchSnapshot('recieved')
    expect(expectedResult.code).toMatchSnapshot('expected')
    expect(code).toEqual(expectedResult.code)
    // expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)
  })

  test.todo('components has slots with native elements')
  test.todo('components has slots with mustache')
})
