import { compile as vaporCompile } from '@vue-vapor/compiler-vapor'
import { expect, test } from 'vitest'
import { makeCompile } from './_utils.ts'
import { transformChildren } from './children.ts'
import { transformComment } from './comment.ts'
import { transformElement } from './element.ts'
import { transformText } from './text.ts'

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
