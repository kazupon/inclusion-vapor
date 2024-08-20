import { expect, test } from 'vitest'
import { makeCompile, DEFAULT_VAPOR_COMPILER_OPTIONS } from './_utils'
import { transformText } from './transformText'
import { transformElement } from './transformElement'
import { transformChildren } from './transformChildren'
import { IRNodeTypes } from '../ir'
import { compile as vaporCompile } from '@vue-vapor/compiler-vapor'

const compileWithTextTransform = makeCompile({
  nodeTransforms: [transformChildren, transformElement, transformText]
})

test('no consecutive text', () => {
  const { code, ir, vaporHelpers } = compileWithTextTransform('<>{ "hello world" }</>')
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
  const { code, ir, vaporHelpers } = compileWithTextTransform('<>{ msg }</>')
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
