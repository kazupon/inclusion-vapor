import { compile as vaporCompile } from '@vue-vapor/compiler-vapor'
import { expect, test } from 'vitest'
import { IRNodeTypes } from '../ir/index.ts'
import { DEFAULT_VAPOR_COMPILER_OPTIONS, makeCompile } from './_utils.ts'
import { transformChildren } from './transformChildren.ts'
import { transformElement } from './transformElement.ts'
import { transformText } from './transformText.ts'

const compileWithTextTransform = makeCompile({
  nodeTransforms: [transformChildren, transformElement, transformText]
})

test('no consecutive text', () => {
  const { code, ir, vaporHelpers } = compileWithTextTransform('{ "hello world" }')
  const expectedResult = vaporCompile('{{ "hello world" }}', DEFAULT_VAPOR_COMPILER_OPTIONS)
  expect(code).toMatchSnapshot()
  expect(code).toEqual(expectedResult.code)
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
  const expectedResult = vaporCompile('{{ msg }}', DEFAULT_VAPOR_COMPILER_OPTIONS)
  expect(code).toMatchSnapshot()
  expect(code).toEqual(expectedResult.code)
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
