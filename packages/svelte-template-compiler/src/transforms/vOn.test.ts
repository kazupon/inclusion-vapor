import { NodeTypes } from '@vue-vapor/compiler-dom'
import { compile as vaporCompile } from '@vue-vapor/compiler-vapor'
import { describe, expect, test } from 'vitest'
import { IRNodeTypes } from '../ir/index.ts'
import { makeCompile } from './_utils.ts'
import { transformChildren } from './transformChildren.ts'
import { transformElement } from './transformElement.ts'
import { transformText } from './transformText.ts'
import { transformVOn } from './vOn.ts'

const compileWithVOn = makeCompile({
  nodeTransforms: [transformElement, transformChildren, transformText],
  directiveTransforms: {
    on: transformVOn
  }
})

describe('event binding', () => {
  test('simple expression: <div on:click={handleClick}></div>`', () => {
    const { ir, code, vaporHelpers, helpers } = compileWithVOn('<div on:click={handleClick}></div>')
    const expectedResult = vaporCompile('<div @click="handleClick"></div>', {
      prefixIdentifiers: true
    })
    expect(code).toMatchSnapshot('received')
    expect(expectedResult.code).toMatchSnapshot('expected')
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

  test('inline expression: <div on:click={x++}></div>`', () => {
    const { ir, code, vaporHelpers, helpers } = compileWithVOn('<div on:click={x++}></div>')
    const expectedResult = vaporCompile('<div @click="x++"></div>', {
      prefixIdentifiers: true
    })
    expect(code).toMatchSnapshot('received')
    expect(expectedResult.code).toMatchSnapshot('expected')
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
