import { NodeTypes } from '@vue-vapor/compiler-dom'
import { compile as vaporCompile } from '@vue-vapor/compiler-vapor'
import { expect, test } from 'vitest'
import { IRNodeTypes } from '../ir/index.ts'
import { makeCompile } from './_utils.ts'
import { transformChildren } from './transformChildren.ts'
import { transformElement } from './transformElement.ts'
import { transformText } from './transformText.ts'
import { transformVBind } from './vBind.ts'
import { transformVIf } from './vIf.ts'

import type { IfIRNode } from '../ir/index.ts'

const compileWithVIf = makeCompile({
  prefixIdentifiers: false,
  nodeTransforms: [transformElement, transformChildren, transformText, transformVIf],
  directiveTransforms: {
    bind: transformVBind
  }
})

test('basic', () => {
  const source1 = `{#if ok}<div>{msg}</div>{/if}`
  const source2 = `<div v-if="ok">{{msg}}</div>`
  const { code, vaporHelpers, ir, helpers } = compileWithVIf(source1)
  const expectedResult = vaporCompile(source2)
  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(vaporHelpers).contains('createIf')
  expect(helpers.size).toBe(0)

  expect(ir.template).toEqual(['<div></div>'])
  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.IF,
      id: 0,
      condition: {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: 'ok',
        isStatic: false
      },
      positive: {
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
  expect((ir.block.operation[0] as IfIRNode).positive.effect).lengthOf(1)
})

test.todo('dedupe same template', () => {
  const source = `{#if ok}
  <div>{msg}</div>
{/if}
{#if ok}
  <div>{msg}</div>
{/if}`
  expect(source).toBe('todo')
})

test.todo('#if + :else', () => {
  const source = `{#if ok}
  <div></div>
{:else}
  <p></p>
{/if}`
  expect(source).toBe('todo')
})

test.todo('#if + :else-if', () => {
  const source = `{#if ok}
  <div></div>
{:else if orNot}
  <p></p>
{/if}`
  expect(source).toBe('todo')
})

test.todo('#if + :else-if + :else', () => {
  const source = `{#if ok}
  <div></div>
{:else if orNot}
  <p></p>
{:else}
  <template>fine</template>
{/if}`
  expect(source).toBe('todo')
})

test.todo('comment between blocks', () => {
  const source = `{#if ok}
  <div></div>
  <!-- foo -->
{:else if orNot}
  <!-- bar -->
  <p></p>
{:else}
  <template>fine</template>
{/if}`
  expect(source).toBe('todo')
})

test.todo('nested #if', () => {
  const source = `{#if ok}
  <p>top</p>
  {#if nested}
    <span>nested</span>
  {:else if nestedElse}
    <span>nestedElseIf</span>
  {:else}
    <span>nestedElse</span>
  {/if}
{:else}
  <template>fine</template>
{/if}`
  expect(source).toBe('todo')
})

test.todo('component #if', () => {
  const source = `{#if ok}
  <MyComponent />
{/if}`
  expect(source).toBe('todo')
})
