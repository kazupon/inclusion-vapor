import { compile as vaporCompile } from '@vue-vapor/compiler-vapor'
import { expect, test } from 'vitest'
import { makeCompile } from './_utils.ts'
import { transformChildren } from './transformChildren.ts'
import { transformComment } from './transformComment.ts'
import { transformElement } from './transformElement.ts'
import { transformText } from './transformText.ts'

const compileWithCommentTransform = makeCompile({
  nodeTransforms: [transformText, transformChildren, transformElement, transformComment]
})

test('simple comment', () => {
  const source = '<!-- hello world -->'
  const { code, ir: _, vaporHelpers } = compileWithCommentTransform(source)
  const expectedResult = vaporCompile(source)
  expect(code).toMatchSnapshot('received')
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
  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')
  expect(code).toEqual(expectedResult.code)
  expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)
})
