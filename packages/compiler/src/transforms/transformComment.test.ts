import { expect, test } from 'vitest'
import { makeCompile } from './_utils'
import { transformComment } from './transformComment'
import { transformElement } from './transformElement'
import { transformChildren } from './transformChildren'
import { transformText } from './transformText'
import { compile as vaporCompile } from '@vue-vapor/compiler-vapor'

const compileWithCommentTransform = makeCompile({
  nodeTransforms: [transformText, transformChildren, transformElement, transformComment]
})

test('simple comment', () => {
  const source = '<!-- hello world -->'
  const { code, ir: _, vaporHelpers } = compileWithCommentTransform(source)
  const expectedResult = vaporCompile(source)
  expect(code).toMatchSnapshot('recieved')
  expect(expectedResult.code).toMatchSnapshot('expected')
  expect(code).toEqual(expectedResult.code)
  expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)
})

test('line break', () => {
  const source = `
<!--
  hello world
-->
`
  const { code, ir: _, vaporHelpers } = compileWithCommentTransform(source)
  const expectedResult = vaporCompile(source)
  expect(code).toMatchSnapshot('recieved')
  expect(expectedResult.code).toMatchSnapshot('expected')
  expect(code).toEqual(expectedResult.code)
  expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)
})
