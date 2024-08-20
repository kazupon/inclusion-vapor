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

test.todo('simple comment', () => {
  const { code, ir: _, vaporHelpers } = compileWithCommentTransform('(// hello world<></>)')
  const expectedResult = vaporCompile('<!-- hello world -->')
  expect(code).toMatchSnapshot('jsx')
  expect(expectedResult.code).toMatchSnapshot('vapor')
  expect(code).toEqual(expectedResult.code)
  expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)
})

test.todo('line break', () => {
  const {
    code,
    ir: _,
    vaporHelpers
  } = compileWithCommentTransform(`(/*
 hello world
*/<></>)`)
  const expectedResult = vaporCompile(`
<!--
  hello world
-->
`)
  expect(code).toMatchSnapshot('jsx')
  expect(expectedResult.code).toMatchSnapshot('vapor')
  expect(code).toEqual(expectedResult.code)
  expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)
})
