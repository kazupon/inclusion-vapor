import { NodeTypes } from '@vue-vapor/compiler-dom'
import { compile as vaporCompile } from '@vue-vapor/compiler-vapor'
import { expect, test } from 'vitest'
import { IRNodeTypes } from '../ir/index.ts'
import { makeCompile } from './_utils.ts'
import { transformChildren } from './transformChildren.ts'
import { transformComment } from './transformComment.ts'
import { transformElement } from './transformElement.ts'
import { transformText } from './transformText.ts'
import { transformVBind } from './vBind.ts'
import { transformVFor } from './vFor.ts'
import { transformVOn } from './vOn.ts'

import type { ForIRNode } from '../ir/index.ts'

const compileWithVFor = makeCompile({
  prefixIdentifiers: false,
  nodeTransforms: [
    transformElement,
    transformChildren,
    transformText,
    transformComment,
    transformVFor
  ],
  directiveTransforms: {
    bind: transformVBind,
    on: transformVOn
  }
})

test('basic', () => {
  const source1 = `{#each items as item (item.id)}
  <div on:click={remove(item)}>{item.name}</div>
{/each}`
  const source2 = `<div v-for="item of items" :key="item.id" @click="remove(item)">{{item.name}}</div>`

  const { code, vaporHelpers, ir, helpers } = compileWithVFor(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(vaporHelpers).contains('createFor')
  expect(helpers.size).toBe(0)
  expect(ir.template).toEqual(['<div></div>'])
  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.FOR,
      id: 0,
      source: {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: 'items'
      },
      value: {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: 'item'
      },
      key: undefined,
      index: undefined,
      render: {
        type: IRNodeTypes.BLOCK,
        dynamic: {
          children: [{ template: 0 }]
        }
      },
      keyProp: {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: 'item.id'
      }
    }
  ])
  expect(ir.block.returns).toEqual([0])
  expect(ir.block.dynamic).toMatchObject({
    children: [{ id: 0 }]
  })
  expect(ir.block.effect).toEqual([])
  expect((ir.block.operation[0] as unknown as ForIRNode).render.effect).lengthOf(1)
})

test('multi effect', () => {
  const source1 = `{#each items as item, index (item.id)}
  <div on:click={remove(item)} item={item} index={index}></div>
{/each}`
  const source2 = `<div v-for="(item, index) of items" :key="item.id" @click="remove(item)" :item="item" :index="index"></div>`

  const { code, vaporHelpers, ir, helpers } = compileWithVFor(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(vaporHelpers).contains('createFor')
  expect(helpers.size).toBe(0)
  expect(ir.template).toEqual(['<div></div>'])
  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.FOR,
      id: 0,
      source: {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: 'items'
      },
      value: {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: 'item'
      },
      key: undefined,
      // TODO:
      // key: {
      // }
      index: {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: 'index'
      },
      keyProp: {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: 'item.id'
      },
      render: {
        type: IRNodeTypes.BLOCK,
        dynamic: {
          children: [{ template: 0 }]
        }
      }
    }
  ])
  expect(ir.block.returns).toEqual([0])
  expect(ir.block.dynamic).toMatchObject({
    children: [{ id: 0 }]
  })
  expect(ir.block.effect).toEqual([])
  expect((ir.block.operation[0] as unknown as ForIRNode).render.effect).lengthOf(2)
})

test('object de-structured value', () => {
  const source1 = `{#each items as { id, value }}
  <span>{id}{value}</span>
{/each}`
  const source2 = `<span v-for="({ id, value }) in items">{{ id }}{{ value }}</span>`

  const { code, vaporHelpers, ir, helpers } = compileWithVFor(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(vaporHelpers).contains('createFor')
  expect(helpers.size).toBe(0)
  expect(ir.template).toEqual(['<span></span>'])
  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.FOR,
      id: 0,
      source: {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: 'items'
      },
      value: {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: '{ id, value }'
      },
      key: undefined,
      index: undefined,
      render: {
        type: IRNodeTypes.BLOCK,
        dynamic: {
          children: [{ template: 0 }]
        }
      },
      keyProp: undefined
    }
  ])
  expect(ir.block.returns).toEqual([0])
  expect(ir.block.dynamic).toMatchObject({
    children: [{ id: 0 }]
  })
  expect(ir.block.effect).toEqual([])
  expect((ir.block.operation[0] as unknown as ForIRNode).render.effect).lengthOf(1)
})

test('object spread value', () => {
  const source1 = `{#each list as { id, ...other }, index (id)}
  <div>{id + other + index}</div>
{/each}`
  const source2 = `<div v-for="({ id, ...other }, index) in list" :key="id">{{ id + other + index }}</div>`

  const { code, vaporHelpers, ir, helpers } = compileWithVFor(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(vaporHelpers).contains('createFor')
  expect(helpers.size).toBe(0)
  expect(ir.template).toEqual(['<div></div>'])
  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.FOR,
      id: 0,
      source: {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: 'list'
      },
      value: {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: '{ id, ...other }'
      },
      key: undefined,
      index: {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: 'index'
      },
      keyProp: {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: 'id'
      },
      render: {
        type: IRNodeTypes.BLOCK,
        dynamic: {
          children: [{ template: 0 }]
        }
      }
    }
  ])
  expect(ir.block.returns).toEqual([0])
  expect(ir.block.dynamic).toMatchObject({
    children: [{ id: 0 }]
  })
  expect(ir.block.effect).toEqual([])
  expect((ir.block.operation[0] as unknown as ForIRNode).render.effect).lengthOf(1)
})

test('array spread value', () => {
  const source1 = `{#each list as [id, ...other], index (id)}
  <div>{id + other + index }</div>
{/each}`
  const source2 = `<div v-for="([id, ...other], index) in list" :key="id">{{ id + other + index }}</div>`

  const { code, vaporHelpers, ir, helpers } = compileWithVFor(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(vaporHelpers).contains('createFor')
  expect(helpers.size).toBe(0)
  expect(ir.template).toEqual(['<div></div>'])
  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.FOR,
      id: 0,
      source: {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: 'list'
      },
      value: {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: '[id, ...other]'
      },
      key: undefined,
      index: {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: 'index'
      },
      keyProp: {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: 'id'
      },
      render: {
        type: IRNodeTypes.BLOCK,
        dynamic: {
          children: [{ template: 0 }]
        }
      }
    }
  ])
  expect(ir.block.returns).toEqual([0])
  expect(ir.block.dynamic).toMatchObject({
    children: [{ id: 0 }]
  })
  expect(ir.block.effect).toEqual([])
  expect((ir.block.operation[0] as unknown as ForIRNode).render.effect).lengthOf(1)
})

test.todo('nested #each', () => {
  const source = `{#each items as item, i (item.id)}
  <div>
  {#each item.children as child, j}
    <span>{ i + j }</span>
  {/each}
  </div>
{/each}`
  expect(source).toBe('todo')
})

test('complex expressions', () => {
  const source1 = `{#each list as { foo = bar, baz: [qux = quux] }}
  <div>{ foo + bar + baz + qux + quux }</div>
{/each}`
  const source2 = `<div v-for="({ foo = bar, baz: [qux = quux] }) in list">
  {{ foo + bar + baz + qux + quux }}
</div>`

  const { code } = compileWithVFor(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(code).contains(`([{ foo = bar, baz: [qux = quux] }]) => {`)
  expect(code).contains(`{ foo + bar + baz + qux + quux }`)
})

test('prefixIdentifiers: true', () => {
  const source1 = `{#each items as item (item.id)}
  <div on:click={remove(item)}>{item.name}</div>
{/each}`
  const source2 = `<div v-for="item of items" :key="item.id" @click="remove(item)">{{item.name}}</div>`

  const { code } = compileWithVFor(source1, {
    prefixIdentifiers: true
  })
  const expectedResult = vaporCompile(source2, { prefixIdentifiers: true })

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(code).contain(
    `_createFor(() => (_ctx.items), _withDestructure(([item]) => [], (_ctx0) => {`
  )
  expect(code).contain(`_setText(n3, _ctx.item.name)`)
})
