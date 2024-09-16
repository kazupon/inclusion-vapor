import { DOMErrorCodes } from '@vue-vapor/compiler-dom'
import { IRNodeTypes, compile as vaporCompile } from '@vue-vapor/compiler-vapor'
import { expect, test, vi } from 'vitest'
import { makeCompile } from './_utils.ts'
import { transformChildren } from './children.ts'
import { transformComment } from './comment.ts'
import { transformElement } from './element.ts'
import { transformVHtml } from './html.ts'
import { transformText } from './text.ts'

const compileWithVHtml = makeCompile({
  prefixIdentifiers: false,
  nodeTransforms: [
    transformElement,
    transformChildren,
    transformText,
    transformComment,
    transformVHtml
  ]
})

test('basic', () => {
  const source1 = `<div>{@html code}</div>`
  const source2 = `<div v-html="code"></div>`

  const { code, vaporHelpers, ir, helpers } = compileWithVHtml(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(vaporHelpers).contains('setHtml')
  expect(helpers.size).toBe(0)
  expect(ir.template).toEqual(['<div></div>'])
  expect(ir.block.effect).toMatchObject([
    {
      expressions: [
        {
          constType: 0,
          content: 'code',
          isStatic: false
        }
      ],
      operations: [
        {
          type: IRNodeTypes.SET_HTML,
          value: {
            constType: 0,
            content: 'code',
            isStatic: false
          }
        }
      ]
    }
  ])
})

test.todo('no expression', () => {
  const source1 = `<div>{@html}</div>`

  const onError = vi.fn()
  const { code } = compileWithVHtml(source1, {
    onError
  })
  expect(code).matchSnapshot()
  expect(onError.mock.calls).toMatchObject([[{ code: DOMErrorCodes.X_V_HTML_NO_EXPRESSION }]])
})
