import { describe, expect, test } from 'vitest'
import { makeCompile } from './_utils'
import { transformChildren } from './transformChildren'

const compileWithTransform = makeCompile({
  nodeTransforms: [transformChildren]
})

describe('compiler: children transform', () => {
  test.todo('basic')

  test('native elements', () => {
    const {
      ir,
      code,
      vaporHelpers: _
    } = compileWithTransform(
      `<div>
        <div>
          <p>Hello</p>
        </div>
        <p>World</p>
      </div>`
    )
    expect(code).toMatchSnapshot()
    expect(ir).toMatchSnapshot()
  })

  test('sibling references', () => {
    const {
      ir,
      code,
      vaporHelpers: _
    } = compileWithTransform(
      `<div>
        <p>{ first }</p>
        { second }
        { third }
        <p>{ forth }</p>
      </div>`
    )
    expect(code).toMatchSnapshot()
    expect(ir).toMatchSnapshot()
    // TODO: vaporHelpers
    // expect(Array.from(vaporHelpers)).containSubset([
    //   'next',
    //   'setText',
    //   'createTextNode',
    //   'insert',
    //   'template',
    // ])
  })

  test('components', () => {
    const {
      ir,
      code,
      vaporHelpers: _
    } = compileWithTransform(
      `<div>
        <Foo>{ foo }</Foo>
        <Bar><Baz /></Bar>
      </div>`
    )
    expect(code).toMatchSnapshot()
    expect(ir).toMatchSnapshot()
    // TODO: vaporHelpers
  })
})
