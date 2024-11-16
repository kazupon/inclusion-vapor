import { NodeTypes } from '@vue-vapor/compiler-dom'
import { compile as vaporCompile } from '@vue-vapor/compiler-vapor'
import { expect, test } from 'vitest'
import { IRNodeTypes } from '../ir/index.ts'
import { makeCompile } from './_utils.ts'
import { transformVBind } from './bind.ts'
import { transformChildren } from './children.ts'
import { transformComment } from './comment.ts'
import { transformElement } from './element.ts'
import { transformVModel } from './model.ts'
import { transformVOn } from './on.ts'
import { transformTemplateRef } from './templateRef.ts'
import { transformText } from './text.ts'

const compileWithTransformRef = makeCompile({
  prefixIdentifiers: false,
  nodeTransforms: [
    transformTemplateRef,
    transformText,
    transformElement,
    transformComment,
    transformChildren
  ],
  directiveTransforms: {
    bind: transformVBind,
    on: transformVOn,
    model: transformVModel
  }
})

test('native element', () => {
  const source1 = '<canvas bind:this={el} />'
  const source2 = '<canvas ref="el" />'
  const { code, ir } = compileWithTransformRef(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('svelte')
  expect(expectedResult.code).toMatchSnapshot('vue')

  expect(code).contains(`_setRef(n0, "el")`)

  expect(ir.template).toEqual(['<canvas></canvas>'])
  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.SET_INHERIT_ATTRS,
      staticProps: false,
      dynamicProps: []
    },
    {
      type: IRNodeTypes.SET_TEMPLATE_REF,
      element: 0,
      effect: false,
      refFor: false,
      value: {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: 'el',
        isStatic: true,
        loc: {
          // TODO: we need to align svelte AST source location
          source: 'el'
        }
      }
    }
  ])
})

test('component', () => {
  const source1 = '<MyComp bind:this={instance} />'
  const source2 = '<MyComp ref="instance" />'

  const { code, ir: _ } = compileWithTransformRef(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('svelte')
  expect(expectedResult.code).toMatchSnapshot('vue')
})
