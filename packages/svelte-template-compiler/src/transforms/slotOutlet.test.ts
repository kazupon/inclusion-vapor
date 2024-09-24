import { NodeTypes } from '@vue-vapor/compiler-dom'
import { compile as vaporCompile } from '@vue-vapor/compiler-vapor'
import { expect, test } from 'vitest'
import { IRNodeTypes } from '../ir/index.ts'
import { makeCompile } from './_utils.ts'
import { transformVBind } from './bind.ts'
import { transformChildren } from './children.ts'
import { transformComment } from './comment.ts'
import { transformElement } from './element.ts'
import { transformVOn } from './on.ts'
import { transformSlotOutlet } from './slotOutlet.ts'
import { transformText } from './text.ts'

const compileWithSlotOutlet = makeCompile({
  prefixIdentifiers: false,
  nodeTransforms: [
    transformSlotOutlet,
    transformText,
    transformElement,
    transformComment,
    transformChildren
  ],
  directiveTransforms: {
    bind: transformVBind,
    on: transformVOn
  }
})

test('default slot', () => {
  const source1 = `<slot />`
  const source2 = `<slot />`

  const { code, ir, vaporHelpers } = compileWithSlotOutlet(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(code).contain(`_createSlot("default", null)`)
  expect(vaporHelpers).toContain('createSlot')
  expect(ir.block.effect).toEqual([])
  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.SLOT_OUTLET_NODE,
      id: 0,
      name: {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: 'default',
        isStatic: true
      },
      props: [],
      fallback: undefined
    }
  ])
})

test('statically named slot', () => {
  const source1 = `<slot name="foo" />`
  const source2 = `<slot name="foo" />`

  const { code, ir } = compileWithSlotOutlet(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(code).contain(`_createSlot("foo", null)`)
  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.SLOT_OUTLET_NODE,
      id: 0,
      name: {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: 'foo',
        isStatic: true
      }
    }
  ])
})

// NOTE: svelte doesn't support dynamic slot names
test.todo('dynamically named slot', () => {
  const source1 = `<slot name={foo + bar} />`
  const source2 = `<slot :name="foo + bar" />`

  const { code, ir } = compileWithSlotOutlet(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(code).contain(`_createSlot(() => (foo + bar), null)`)
  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.SLOT_OUTLET_NODE,
      id: 0,
      name: {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: 'foo + bar',
        isStatic: false
      }
    }
  ])
})

test('default slot with props', () => {
  const source1 = `<slot foo="bar" baz={qux} foo-bar={fooBar} />`
  const source2 = `<slot foo="bar" :baz="qux" :foo-bar="fooBar" />`

  const { code, ir } = compileWithSlotOutlet(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.SLOT_OUTLET_NODE,
      name: { content: 'default' },
      props: [
        [
          { key: { content: 'foo' }, values: [{ content: 'bar' }] },
          { key: { content: 'baz' }, values: [{ content: 'qux' }] },
          { key: { content: 'fooBar' }, values: [{ content: 'fooBar' }] }
        ]
      ]
    }
  ])
})

test('statically named slot with props', () => {
  const source1 = `<slot name="foo" baz={qux} foo-bar={fooBar} />`
  const source2 = `<slot name="foo" :baz="qux" :foo-bar="fooBar" />`

  const { code, ir } = compileWithSlotOutlet(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.SLOT_OUTLET_NODE,
      name: { content: 'foo' },
      props: [
        [
          { key: { content: 'baz' }, values: [{ content: 'qux' }] },
          { key: { content: 'fooBar' }, values: [{ content: 'fooBar' }] }
        ]
      ]
    }
  ])
})

test('statically named slot with spread props', () => {
  const source1 = `<slot name="foo" {...things} />`
  const source2 = `<slot name="foo" v-bind="things" />`

  const { code, ir } = compileWithSlotOutlet(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.SLOT_OUTLET_NODE,
      name: { content: 'foo' },
      props: [{ value: { content: 'things', isStatic: false } }]
    }
  ])
})

// NOTE: svelte doesn't support event handling on slot
test.todo('statically named slot with on:event', () => {
  const source1 = `<slot name="test" on:click={foo} on:bar={bar} baz={qux} />`
  const source2 = `<slot name="test" @click="foo" v-on="bar" :baz="qux" />`

  const { code, ir } = compileWithSlotOutlet(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.SLOT_OUTLET_NODE,
      name: { content: 'test' },
      props: [
        [{ key: { content: 'click' }, values: [{ content: 'foo' }] }],
        { value: { content: 'bar' }, handler: true },
        [{ key: { content: 'baz' }, values: [{ content: 'qux' }] }]
      ]
    }
  ])
})

test('default slot with fallback', () => {
  const source1 = `<slot><div/></slot>`
  const source2 = `<slot><div/></slot>`

  const { code, ir } = compileWithSlotOutlet(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(ir.template[0]).toBe('<div></div>')
  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.SLOT_OUTLET_NODE,
      id: 0,
      name: { content: 'default' },
      fallback: {
        type: IRNodeTypes.BLOCK,
        dynamic: {
          children: [{ template: 0, id: 2 }]
        },
        returns: [2]
      }
    }
  ])
})

test('named slot with fallback', () => {
  const source1 = `<slot name="foo"><div/></slot>`
  const source2 = `<slot name="foo"><div/></slot>`

  const { code, ir } = compileWithSlotOutlet(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(ir.template[0]).toBe('<div></div>')
  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.SLOT_OUTLET_NODE,
      id: 0,
      name: { content: 'foo' },
      fallback: {
        type: IRNodeTypes.BLOCK,
        dynamic: {
          children: [{ template: 0, id: 2 }]
        },
        returns: [2]
      }
    }
  ])
})

test('default slot with fallback and props', () => {
  const source1 = `<slot foo={bar}><div/></slot>`
  const source2 = `<slot :foo="bar"><div/></slot>`

  const { code, ir } = compileWithSlotOutlet(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(ir.template[0]).toBe('<div></div>')
  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.SLOT_OUTLET_NODE,
      id: 0,
      name: { content: 'default' },
      props: [[{ key: { content: 'foo' }, values: [{ content: 'bar' }] }]],
      fallback: {
        type: IRNodeTypes.BLOCK,
        dynamic: {
          children: [{ template: 0, id: 2 }]
        },
        returns: [2]
      }
    }
  ])
})

test('named slot with fallback and props', () => {
  const source1 = `<slot name="foo" foo={bar}><div/></slot>`
  const source2 = `<slot name="foo" :foo="bar"><div/></slot>`

  const { code, ir } = compileWithSlotOutlet(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(ir.template[0]).toBe('<div></div>')
  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.SLOT_OUTLET_NODE,
      id: 0,
      name: { content: 'foo' },
      props: [[{ key: { content: 'foo' }, values: [{ content: 'bar' }] }]],
      fallback: {
        type: IRNodeTypes.BLOCK,
        dynamic: {
          children: [{ template: 0, id: 2 }]
        },
        returns: [2]
      }
    }
  ])
})
