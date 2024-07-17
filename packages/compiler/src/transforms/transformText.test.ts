import { expect, test } from 'vitest'
import { makeCompile } from './_utils'
import { transformText } from './transformText'
import { transformElement } from './transformElement'
import { transformChildren } from './transformChildren'
import { IRNodeTypes } from '../ir'

const compileWithTextTransform = makeCompile({
  nodeTransforms: [transformChildren, transformElement, transformText]
})

test('no consecutive text', () => {
  const { code, ir, vaporHelpers } = compileWithTextTransform('{ "hello world" }')
  expect(code).toMatchSnapshot()
  expect(vaporHelpers).contains.all.keys('createTextNode')
  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.CREATE_TEXT_NODE,
      id: 0,
      values: [
        {
          type: IRNodeTypes.SET_TEXT,
          content: '"hello world"',
          isStatic: false
        }
      ],
      effect: false
    }
  ])
})

test('consecutive text', () => {
  const { code, ir, vaporHelpers } = compileWithTextTransform('{ msg }')
  expect(code).toMatchSnapshot()
  expect(vaporHelpers).contains.all.keys('createTextNode')
  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.CREATE_TEXT_NODE,
      id: 0,
      values: [
        {
          type: IRNodeTypes.SET_TEXT,
          content: 'msg',
          isStatic: false
        }
      ],
      effect: true
    }
  ])
})
