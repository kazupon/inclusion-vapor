import { describe, expect, test } from 'vitest'
import { compile as vaporCompile } from '@vue-vapor/compiler-vapor'
import { NodeTypes } from '@vue-vapor/compiler-dom'
import { makeCompile } from './_utils'
import { transformElement } from './transformElement'
import { transformChildren } from './transformChildren'
import { transformText } from './transformText'
import { IRNodeTypes, DynamicFlag } from '../ir'
import { transformVBind } from './vBind'

const compileWithVBind = makeCompile({
  nodeTransforms: [transformElement, transformChildren, transformText],
  directiveTransforms: {
    bind: transformVBind
  }
})

describe('svelte binding', () => {
  test('basic: <div id={id} />', () => {
    const { ir, code, vaporHelpers } = compileWithVBind('<div id={id} />')
    const expectedResult = vaporCompile('<div :id="id" />', { prefixIdentifiers: true })
    expect(code).toMatchSnapshot('received')
    expect(expectedResult.code).toMatchSnapshot('expected')
    expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)

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
                // TODO:
                // start: { line: 1, column: 13, offset: 12 },
                // end: { line: 1, column: 15, offset: 14 },
                source: 'id'
              }
            },
            values: [
              {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: 'id',
                isStatic: false,
                loc: {
                  source: 'id'
                  // TODO:
                  // start: { line: 1, column: 17, offset: 16 },
                  // end: { line: 1, column: 19, offset: 18 },
                }
              }
            ],
            loc: {
              // TODO:
              // start: { column: 6, line: 1, offset: 5 },
              // end: { column: 20, line: 1, offset: 19 },
              // TODO: we want to map for svelte code correctly...
              // source: 'id={id}',
            },
            runtimeCamelize: false
          }
        }
      ]
    })
  })

  test('shorthand: <div {id} />', () => {
    const { ir, code, vaporHelpers } = compileWithVBind('<div {id} />')
    const expectedResult = vaporCompile('<div :id />', { prefixIdentifiers: true })
    expect(code).toMatchSnapshot('received')
    expect(expectedResult.code).toMatchSnapshot('expected')
    expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)

    expect(code).contains('_setDynamicProp(n0, "id", _ctx.id)')
    expect(ir.block.effect[0].operations[0]).toMatchObject({
      type: IRNodeTypes.SET_PROP,
      prop: {
        key: {
          content: `id`,
          isStatic: true
        },
        values: [
          {
            content: `id`,
            isStatic: false
          }
        ]
      }
    })
  })

  test('camel case: <div camel-case={value1} />', () => {
    const { code, vaporHelpers } = compileWithVBind('<div camel-case={value1} />')
    const expectedResult = vaporCompile('<div :camel-case="value1" /> ', {
      prefixIdentifiers: true
    })
    expect(code).toMatchSnapshot('received')
    expect(expectedResult.code).toMatchSnapshot('expected')
    expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)

    expect(code).contains('_setDynamicProp(n0, "camel-case", _ctx.value1)')
  })
})
