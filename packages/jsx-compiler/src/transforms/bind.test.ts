import { NodeTypes } from '@vue-vapor/compiler-dom'
import { compile as vaporCompile } from '@vue-vapor/compiler-vapor'
import { describe, expect, test } from 'vitest'
import { DynamicFlag, IRNodeTypes } from '../ir/index.ts'
import { makeCompile } from './_utils.ts'
import { transformBind } from './bind.ts'
import { transformChildren } from './children.ts'
import { transformElement } from './element.ts'
import { transformText } from './text.ts'

const compileWithVBind = makeCompile({
  nodeTransforms: [transformElement, transformChildren, transformText],
  directiveTransforms: {
    bind: transformBind
  }
})

describe('jsx binding', () => {
  test('basic: <div id={id} />', () => {
    const vaporSource = '<div :id="id" />'
    const jsxSource = '(<><div id={id} /></>)'
    const { ir, code, vaporHelpers: __ } = compileWithVBind(jsxSource)
    const expectedResult = vaporCompile(vaporSource, { prefixIdentifiers: true })
    expect(code).toMatchSnapshot('jsx')
    expect(expectedResult.code).toMatchSnapshot('vapor')
    // expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)

    expect(code).contains('_setDynamicProp(n0, "id", _ctx.id)')
    expect(ir.block.dynamic.children[0]).toMatchObject({
      id: 0,
      flags: DynamicFlag.REFERENCED
    })
    expect(ir.template).toEqual(['<div></div>'])
    expect(ir.block.effect).lengthOf(1)
    expect(ir.block.effect[0].expressions).lengthOf(1)
    expect(ir.block.effect[0].operations).lengthOf(1)
    expect(ir.block.effect[0]).toMatchObject({
      expressions: [
        {
          type: NodeTypes.SIMPLE_EXPRESSION,
          content: 'id',
          isStatic: false
        }
      ],
      operations: [
        {
          type: IRNodeTypes.SET_PROP,
          element: 0,
          prop: {
            key: {
              type: NodeTypes.SIMPLE_EXPRESSION,
              content: 'id',
              isStatic: true,
              loc: {
                start: { line: 1, column: 9, offset: 8 },
                end: { line: 1, column: 11, offset: 10 },
                source: 'id'
              }
            },
            values: [
              {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: 'id',
                isStatic: false,
                loc: {
                  source: 'id',
                  start: { line: 1, column: 12, offset: 11 },
                  end: { line: 1, column: 16, offset: 15 }
                }
              }
            ],
            loc: {
              start: { column: 8, line: 1 },
              end: { column: 15, line: 1 }
            },
            runtimeCamelize: false
          }
        }
      ]
    })
  })

  // test.skip('shorthand: <div {...props} />', () => {
  //   const { ir, code, vaporHelpers } = compileWithVBind('(<><div {...props} /></>)')
  //   const expectedResult = vaporCompile('<div :props />', { prefixIdentifiers: true })
  //   expect(code).toMatchSnapshot('jsx')
  //   expect(expectedResult.code).toMatchSnapshot('vapor')
  //   expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)

  //   expect(code).contains('_setDynamicProp(n0, "id", _ctx.id)')
  //   expect(ir.block.effect[0].operations[0]).toMatchObject({
  //     type: IRNodeTypes.SET_PROP,
  //     prop: {
  //       key: {
  //         content: `id`,
  //         isStatic: true
  //       },
  //       values: [
  //         {
  //           content: `id`,
  //           isStatic: false
  //         }
  //       ]
  //     }
  //   })
  // })

  test('camel case: <div camel-case={value1} />', () => {
    const { code, vaporHelpers: __ } = compileWithVBind('(<><div camel-case={value1} /></>)')
    const expectedResult = vaporCompile('<div :camel-case="value1" /> ', {
      prefixIdentifiers: true
    })
    expect(code).toMatchSnapshot('jsx')
    expect(expectedResult.code).toMatchSnapshot('vapor')
    // expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)

    expect(code).contains('_setDynamicProp(n0, "camel-case", _ctx.value1)')
  })
})
