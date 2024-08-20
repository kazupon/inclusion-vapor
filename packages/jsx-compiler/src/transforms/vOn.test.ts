import { describe, expect, test } from 'vitest'
import { compile as vaporCompile } from '@vue-vapor/compiler-vapor'
import { NodeTypes } from '@vue-vapor/compiler-dom'
import { makeCompile } from './_utils'
import { transformElement } from './transformElement'
import { transformChildren } from './transformChildren'
import { transformText } from './transformText'
import { IRNodeTypes } from '../ir'
import { transformVOn } from './vOn'

const compileWithVOn = makeCompile({
  nodeTransforms: [transformElement, transformChildren, transformText],
  directiveTransforms: {
    on: transformVOn
  }
})

describe('event binding', () => {
  test('simple expression: <div onClick={handleClick}></div>`', () => {
    const { ir, code, vaporHelpers, helpers } = compileWithVOn(
      '(<><div onClick={handleClick}></div></>)'
    )
    const expectedResult = vaporCompile('<div @click="handleClick"></div>', {
      prefixIdentifiers: true
    })
    expect(code).toMatchSnapshot('jsx')
    expect(expectedResult.code).toMatchSnapshot('vapor')
    expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)

    expect(vaporHelpers).contains('delegate')
    expect(helpers.size).toBe(0)
    expect(ir.block.effect).toEqual([])
    expect(ir.block.operation).toMatchObject([
      {
        type: IRNodeTypes.SET_EVENT,
        element: 0,
        key: {
          type: NodeTypes.SIMPLE_EXPRESSION,
          content: 'click',
          isStatic: true
        },
        value: {
          type: NodeTypes.SIMPLE_EXPRESSION,
          content: 'handleClick',
          isStatic: false
        },
        modifiers: { keys: [], nonKeys: [], options: [] },
        keyOverride: undefined,
        delegate: true
      }
    ])
  })

  test('inline expression: <div onClick={x++}></div>`', () => {
    const { ir, code, vaporHelpers, helpers } = compileWithVOn('(<><div onClick={x++}></div></>)')
    const expectedResult = vaporCompile('<div @click="x++"></div>', {
      prefixIdentifiers: true
    })
    expect(code).toMatchSnapshot('jsx')
    expect(expectedResult.code).toMatchSnapshot('vapr')
    expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)

    expect(vaporHelpers).contains('delegate')
    expect(helpers.size).toBe(0)
    expect(ir.block.effect).toEqual([])
    expect(ir.block.operation).toMatchObject([
      {
        type: IRNodeTypes.SET_EVENT,
        element: 0,
        value: {
          type: NodeTypes.SIMPLE_EXPRESSION,
          content: 'x++',
          isStatic: false
        },
        delegate: true
      }
    ])
    expect(code).contains(`_delegate(n0, "click", () => $event => (_ctx.x++))`)
  })
})
