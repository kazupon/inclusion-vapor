import { NodeTypes } from '@vue-vapor/compiler-dom'
import { compile as vaporCompile } from '@vue-vapor/compiler-vapor'
import { expect, test } from 'vitest'
import { IRNodeTypes } from '../ir/index.ts'
import { makeCompile } from './_utils.ts'
import { transformBind } from './bind.ts'
import { transformChildren } from './children.ts'
import { transformComment } from './comment.ts'
import { transformElement } from './element.ts'
import { transformFor } from './for.ts'
import { transformOn } from './on.ts'
import { transformText } from './text.ts'

import type { ForIRNode } from '../ir/index.ts'

const compileWithVFor = makeCompile({
  prefixIdentifiers: false,
  nodeTransforms: [
    transformElement,
    transformChildren,
    transformText,
    transformComment,
    transformFor
  ],
  directiveTransforms: {
    bind: transformBind,
    on: transformOn
  }
})

test('basic', () => {
  const source1 = `{#each items as item (item.id)}
  <div on:click={remove(item)}>{item.name}</div>
{/each}`
  const source2 = `<div v-for="item of items" :key="item.id" @click="remove(item)">{{item.name}}</div>`

  const { code, vaporHelpers, ir, helpers } = compileWithVFor(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('svelte')
  expect(expectedResult.code).toMatchSnapshot('vue')

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

  expect(code).toMatchSnapshot('svelte')
  expect(expectedResult.code).toMatchSnapshot('vue')

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

  expect(code).toMatchSnapshot('svelte')
  expect(expectedResult.code).toMatchSnapshot('vue')

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

  expect(code).toMatchSnapshot('svelte')
  expect(expectedResult.code).toMatchSnapshot('vue')

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

  expect(code).toMatchSnapshot('svelte')
  expect(expectedResult.code).toMatchSnapshot('vue')

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

test('nested #each', () => {
  const source1 = `{#each list as i}
  <div>
  {#each i as j}
    <span>{ j + i }</span>
  {/each}
  </div>
{/each}`
  const source2 = `<div v-for="i in list">
  <span v-for="j in i">{{ j + i }}</span>
</div>`

  const { code, ir } = compileWithVFor(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('svelte')
  expect(expectedResult.code).toMatchSnapshot('vue')

  expect(ir.template).toEqual(['<span></span>', '<div></div>'])
  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.FOR,
      id: 0,
      source: { content: 'list' },
      value: { content: 'i' },
      render: {
        type: IRNodeTypes.BLOCK,
        dynamic: {
          children: [{ template: 1 }]
        }
      }
    }
  ])
  expect((ir.block.operation[0] as unknown as ForIRNode).render.operation[0]).toMatchObject({
    type: IRNodeTypes.FOR,
    id: 2,
    source: { content: 'i' },
    value: { content: 'j' },
    render: {
      type: IRNodeTypes.BLOCK,
      dynamic: {
        children: [{ template: 0 }]
      }
    }
  })
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

  expect(code).toMatchSnapshot('svelte')
  expect(expectedResult.code).toMatchSnapshot('vue')

  expect(code).contains(`([{ foo = bar, baz: [qux = quux] }]) => {`)
  expect(code).contains(`foo + bar + baz + qux + quux`)
})

test('with else block', () => {
  const source1 = `{#each items as item}
  <p>{item}</p>
{:else}
  <p>no item</p>
{/each}`
  const source2 = `<template v-if="items.length">
  <p v-for="item in items">{{ item }}</p>
</template>
<template v-else>
  <p>no item</p>
</template>`

  const { code } = compileWithVFor(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('svelte')
  expect(expectedResult.code).toMatchSnapshot('vue')

  expect(code).contain(`_createIf(() => (Array.from(items).length), () => {`)
  expect(code).contain(`_createFor(() => (items), ([item]) => {`)
})

test('prefixIdentifiers: true', () => {
  const source1 = `{#each items as item (item.id)}
  <div on:click={remove(item)}>{item.name}</div>
{/each}`
  const source2 = `<div v-for="item of items" :key="item.id" @click="remove(item)">{{item.name}}</div>`

  const { code } = compileWithVFor(source1, { prefixIdentifiers: true })
  const expectedResult = vaporCompile(source2, { prefixIdentifiers: true })

  expect(code).toMatchSnapshot('svelte')
  expect(expectedResult.code).toMatchSnapshot('vue')

  expect(code).contain(
    `_createFor(() => (_ctx.items), _withDestructure(([item]) => [], (_ctx0) => {`
  )
  expect(code).contain(`_setText(n3, _ctx.item.name)`)
})
