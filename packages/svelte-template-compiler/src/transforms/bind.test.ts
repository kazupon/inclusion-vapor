import { NodeTypes } from '@vue-vapor/compiler-dom'
import { compile as vaporCompile } from '@vue-vapor/compiler-vapor'
import { expect, test } from 'vitest'
import { DynamicFlag, IRNodeTypes } from '../ir/index.ts'
import { makeCompile } from './_utils.ts'
import { transformVBind } from './bind.ts'
import { transformChildren } from './children.ts'
import { transformElement } from './element.ts'
import { transformText } from './text.ts'

const compileWithVBind = makeCompile({
  nodeTransforms: [transformText, transformElement, transformChildren],
  directiveTransforms: {
    bind: transformVBind
  }
})

test('mustache basic', () => {
  const { ir, code, vaporHelpers } = compileWithVBind('<div id={id} />')
  const expectedResult = vaporCompile('<div :id="id" />', { prefixIdentifiers: true })

  expect(code).toMatchSnapshot('svelte')
  expect(expectedResult.code).toMatchSnapshot('vue')
  expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)

  expect(code).contains('_setDynamicProp(n0, "id", _ctx.id, true)')

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

test('mustache shorthand', () => {
  const { ir, code, vaporHelpers } = compileWithVBind('<div {id} />')
  const expectedResult = vaporCompile('<div :id />', { prefixIdentifiers: true })

  expect(code).toMatchSnapshot('svelte')
  expect(expectedResult.code).toMatchSnapshot('vue')
  expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)

  expect(code).contains('_setDynamicProp(n0, "id", _ctx.id, true)')
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

test('attribute camel case', () => {
  const { code, vaporHelpers } = compileWithVBind('<div camel-case={value1} />')
  const expectedResult = vaporCompile('<div :camel-case="value1" /> ', {
    prefixIdentifiers: true
  })

  expect(code).toMatchSnapshot('svelte')
  expect(expectedResult.code).toMatchSnapshot('vue')
  expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)

  expect(code).contains('_setDynamicProp(n0, "camel-case", _ctx.value1, true)')
})

test('class expression binding', () => {
  const { code, ir } = compileWithVBind(`<div class={ isActive ? 'active' : '' } />`)
  const expectedResult = vaporCompile(`<div :class="isActive ? 'active' : ''" />`, {
    prefixIdentifiers: true
  })

  expect(code).toMatchSnapshot('svelte')
  expect(expectedResult.code).toMatchSnapshot('vue')

  expect(code).contains(`_renderEffect(() => _setClass(n0, _ctx.isActive ? 'active' : '', true))`)
  expect(ir.block.effect[0]).toMatchObject({
    expressions: [
      {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: `isActive ? 'active' : ''`,
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
            content: 'class',
            isStatic: true,
            loc: {
              // TODO:
              // source: 'class'
            }
          },
          values: [
            {
              type: NodeTypes.SIMPLE_EXPRESSION,
              content: `isActive ? 'active' : ''`,
              isStatic: false,
              loc: {
                source: `isActive ? 'active' : ''`
                // TODO:
              }
            }
          ],
          loc: {
            // TODO:
          },
          runtimeCamelize: false
        }
      }
    ]
  })
})

test('class dynamic binding', () => {
  const { code, ir } = compileWithVBind(`<div class:active={ isActive } />`)
  const expectedResult = vaporCompile(`<div :class="{ active: isActive }" />`, {
    prefixIdentifiers: true
  })

  expect(code).toMatchSnapshot('svelte')
  expect(expectedResult.code).toMatchSnapshot('vue')

  expect(code).contains(`_renderEffect(() => _setClass(n0, { active: _ctx.isActive }, true))`)
  expect(ir.block.effect[0]).toMatchObject({
    expressions: [
      {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: `{ active: isActive }`,
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
            content: 'class',
            isStatic: true,
            loc: {
              // TODO:
              source: 'class'
            }
          },
          values: [
            {
              type: NodeTypes.SIMPLE_EXPRESSION,
              content: `{ active: isActive }`,
              isStatic: false,
              loc: {
                // TODO: also need to map for svelte code
                // source: `{ isActive }`,
              }
            }
          ],
          loc: {
            // TODO: also need to map for svelte code
            // source: `class:active={ isActive }`,
          },
          runtimeCamelize: false
        }
      }
    ]
  })
})

test('class shorthand binding', () => {
  const { code, ir } = compileWithVBind(`<div class:active />`)
  const expectedResult = vaporCompile(`<div :class="{ active }" />`, {
    prefixIdentifiers: true
  })

  expect(code).toMatchSnapshot('svelte')
  expect(expectedResult.code).toMatchSnapshot('vue')

  expect(code).contains(`_renderEffect(() => _setClass(n0, { active: _ctx.active }, true))`)
  expect(ir.block.effect[0]).toMatchObject({
    expressions: [
      {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: `{ active: active }`,
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
            content: 'class',
            isStatic: true,
            loc: {
              // TODO:
              source: 'class'
            }
          },
          values: [
            {
              type: NodeTypes.SIMPLE_EXPRESSION,
              content: `{ active: active }`,
              isStatic: false,
              loc: {
                // TODO: also need to map for svelte code
                // source: `class:active`,
              }
            }
          ],
          loc: {
            // TODO: also need to map for svelte code
            // source: `class:active`,
          },
          runtimeCamelize: false
        }
      }
    ]
  })
})

test.todo('multiple class binding', () => {
  const { code, ir: _ } = compileWithVBind(
    `<div class="static" class:active class:inactive={!active} class:isAdmin />`
  )
  const expectedResult = vaporCompile(
    `<div class="static" :class="{ active, inactive: !active, isAdmin }" />`,
    {
      prefixIdentifiers: true
    }
  )

  expect(code).toMatchSnapshot('svelte')
  expect(expectedResult.code).toMatchSnapshot('vue')

  expect(code).contains(
    `_renderEffect(() => _setClass(n2, ["static", { active, inactive: !active, isAdmin }]))`
  )
})

test('style expression binding', () => {
  const source1 = `<div style:color={myColor}>color</div>`
  const source2 = `<div :style="{ color: myColor }">color</div>`

  const { code, ir } = compileWithVBind(source1)
  const expectedResult = vaporCompile(source2, { prefixIdentifiers: true })

  expect(code).toMatchSnapshot('svelte')
  expect(expectedResult.code).toMatchSnapshot('vue')

  expect(ir.template).toEqual(['<div>color</div>'])

  expect(code).contains(`_renderEffect(() => _setStyle(n0, { color: _ctx.myColor }, true))`)
})

test('style shorthand binding', () => {
  const source1 = `<div style:color>color</div>`
  const source2 = `<div :style="{ color }">color</div>`

  const { code, ir } = compileWithVBind(source1)
  const expectedResult = vaporCompile(source2, { prefixIdentifiers: true })

  expect(code).toMatchSnapshot('svelte')
  expect(expectedResult.code).toMatchSnapshot('vue')

  expect(ir.template).toEqual(['<div>color</div>'])

  expect(code).contains(`_renderEffect(() => _setStyle(n0, { color: _ctx.color }, true))`)
})

test.todo('style `imporant` modifier', () => {
  const source1 = `<div style:color|important="red">modifier</div>`
  const source2 = `<div :style="{ color: 'red !important' }">modifier</div>`

  const { code, ir } = compileWithVBind(source1)
  const expectedResult = vaporCompile(source2, { prefixIdentifiers: true })

  expect(code).toMatchSnapshot('svelte')
  expect(expectedResult.code).toMatchSnapshot('vue')

  expect(code).contains(`_renderEffect(() => _setStyle(n0, { color: 'red !important' }))`)

  expect(ir.template).toEqual(['<div>modifier</div>'])
})

test.todo('multiple style binding', () => {
  const source1 = `<div style:color style:width="12rem" style:background-color={darkMode ? 'black' : 'white'}>multiple</div>`
  const source2 = `<div :style="{ color, width: '12rem', 'background-color': { darkMode ? 'black' : 'white' }">multiple</div>`

  const { code, ir } = compileWithVBind(source1)
  const expectedResult = vaporCompile(source2, { prefixIdentifiers: true })

  expect(code).toMatchSnapshot('svelte')
  expect(expectedResult.code).toMatchSnapshot('vue')

  expect(code).contains(
    `_renderEffect(() => _setStyle(n1, { color, width: '12rem', 'background-color': { darkMode ? 'black' : 'white' }))`
  )

  expect(ir.template).toEqual(['<div>multiple</div>'])
})

test.todo('style override', () => {
  const source1 = `<div style="color: blue;" style:color="red">This will be red</div>`
  const source2 = `<div style="color: blue;" :style="{ color: 'red' }">This will be red</div>`

  const { code, ir } = compileWithVBind(source1)
  const expectedResult = vaporCompile(source2, { prefixIdentifiers: true })

  expect(code).toMatchSnapshot('svelte')
  expect(expectedResult.code).toMatchSnapshot('vue')

  expect(code).contains(`_renderEffect(() => _setStyle(n3, ["color: blue;", { color: 'red' }]))`)

  expect(ir.template).toEqual(['<div>This will be red</div>'])
})
