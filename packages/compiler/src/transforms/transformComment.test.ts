import { expect, test } from 'vitest'
import { makeCompile } from './_utils'
import { transformComment } from './transformComment'
import { transformElement } from './transformElement'
import { transformChildren } from './transformChildren'

const compileWithCommentTransform = makeCompile({
  nodeTransforms: [transformChildren, transformElement, transformComment]
})

test('simple comment', () => {
  const { code, ir: _ir, vaporHelpers } = compileWithCommentTransform('<!-- hello world -->')
  expect(code).toMatchSnapshot()
  expect(vaporHelpers).contains.all.keys('template')
})

test('line break', () => {
  const { code } = compileWithCommentTransform(`
    <!--
    hello world
    -->`)
  expect(code).toMatchSnapshot()
})
