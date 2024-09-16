import { NodeTypes } from '@vue-vapor/compiler-dom'
import { compile as vaporCompile } from '@vue-vapor/compiler-vapor'
import { expect, test } from 'vitest'
import { IRNodeTypes } from '../ir/index.ts'
import { makeCompile } from './_utils.ts'
import { transformVBind } from './bind.ts'
import { transformChildren } from './children.ts'
import { transformComment } from './comment.ts'
import { transformElement } from './element.ts'
import { transformVIf } from './if.ts'
import { transformText } from './text.ts'

import type { IfIRNode } from '../ir/index.ts'

const compileWithVIf = makeCompile({
  prefixIdentifiers: false,
  nodeTransforms: [
    transformElement,
    transformChildren,
    transformText,
    transformComment,
    transformVIf
  ],
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

test('#if + :else', () => {
  const source1 = `{#if ok}<div></div>{:else}<p></p>{/if}`
  const source2 = `<div v-if="ok"/><p v-else/>`

  const { code, ir, vaporHelpers, helpers } = compileWithVIf(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(ir.template).toEqual(['<div></div>', '<p></p>'])
  expect(vaporHelpers).contains('createIf')
  expect(ir.block.effect).lengthOf(0)
  expect(helpers).lengthOf(0)
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
      },
      negative: {
        type: IRNodeTypes.BLOCK,
        dynamic: {
          children: [{ template: 1 }]
        }
      }
    }
  ])
  expect(ir.block.returns).toEqual([0])
})

test('#if + :else-if', () => {
  const source1 = `{#if ok}<div></div>{:else if orNot}<p></p>{/if}`
  const source2 = `<div v-if="ok"/><p v-else-if="orNot"/>`

  const { code, ir } = compileWithVIf(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(ir.template).toEqual(['<div></div>', '<p></p>'])
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
      },
      negative: {
        type: IRNodeTypes.IF,
        condition: {
          type: NodeTypes.SIMPLE_EXPRESSION,
          content: 'orNot',
          isStatic: false
        },
        positive: {
          type: IRNodeTypes.BLOCK,
          dynamic: {
            children: [{ template: 1 }]
          }
        }
      }
    }
  ])
  expect(ir.block.returns).toEqual([0])
})

test('#if + :else-if + :else', () => {
  const source1 = `{#if ok}<div></div>{:else if orNot}<p></p>{:else}<span>fine</span>{/if}`
  const source2 = `<div v-if="ok"/><p v-else-if="orNot"/><span v-else>fine</span>`

  const { code, ir } = compileWithVIf(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(ir.template).toEqual(['<div></div>', '<p></p>', '<span>fine</span>'])
  expect(ir.block.returns).toEqual([0])
  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.IF,
      id: 0,
      positive: {
        type: IRNodeTypes.BLOCK,
        dynamic: {
          children: [{ template: 0 }]
        }
      },
      negative: {
        type: IRNodeTypes.IF,
        positive: {
          type: IRNodeTypes.BLOCK,
          dynamic: {
            children: [{ template: 1 }]
          }
        },
        negative: {
          type: IRNodeTypes.BLOCK,
          dynamic: {
            children: [{ template: 2 }]
          }
        }
      }
    }
  ])
})

test('dedupe same template', () => {
  const source1 = `{#if ok}<div>hello</div>{/if}{#if ok}<div>hello</div>{/if}`
  const source2 = `<div v-if="ok">hello</div><div v-if="ok">hello</div>`

  const { code, ir } = compileWithVIf(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(ir.template).toEqual(['<div>hello</div>'])
  expect(ir.block.returns).toEqual([0, 3])
})

test('comment between blocks', () => {
  const source1 = `{#if ok}
  <div></div>
  <!--foo-->
{:else if orNot}
  <p></p>
  <!--bar-->
{:else}
  fine
{/if}`
  const source2 = `<div v-if="ok"/>
<!--foo-->
<p v-else-if="orNot"/>
<!--bar-->
<template v-else>fine</template>
`
  const { code, ir } = compileWithVIf(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  // TODO: should normalize whitespace or line breaks for Svelte Text node
  for (const template of ['<div></div>', '<!--foo-->', '<p></p>', '<!--bar-->', 'fine']) {
    expect(ir.template).toContain(template)
  }
  // expect(ir.template).toEqual(['<div></div>', '<!--foo-->', '<p></p>', '<!--bar-->', 'fine'])
})

test('nested #if', () => {
  const source1 = `{#if ok}
  {#if nested}
    <span>nested</span>
  {:else if nestedElse}
    <span>nestedElseIf</span>
  {:else}
    <span>nestedElse</span>
  {/if}
{:else}
  fine
{/if}`
  const source2 = `<template v-if="ok">
  <span v-if="nested">nested</span>
  <span v-else-if="nestedElse">nestedElseIf</span>
  <span v-else>nestedElse</span>
</template>
<template v-else>fine</template>`
  const { code, ir } = compileWithVIf(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(ir.template).toEqual([
    '<span>nested</span>',
    '<span>nestedElseIf</span>',
    '<span>nestedElse</span>',
    'fine'
  ])
  expect(ir.block.returns).toEqual([0])
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
        operation: [
          {
            type: IRNodeTypes.IF,
            condition: {
              type: NodeTypes.SIMPLE_EXPRESSION,
              content: 'nested',
              isStatic: false
            },
            positive: {
              type: IRNodeTypes.BLOCK,
              dynamic: {
                children: [{ template: 0 }]
              }
            },
            negative: {
              type: IRNodeTypes.IF,
              condition: {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: 'nestedElse',
                isStatic: false
              },
              positive: {
                type: IRNodeTypes.BLOCK,
                dynamic: {
                  children: [{ template: 1 }]
                }
              },
              negative: {
                type: IRNodeTypes.BLOCK,
                dynamic: {
                  children: [{ template: 2 }]
                }
              }
            }
          }
        ]
      },
      negative: {
        type: IRNodeTypes.BLOCK,
        dynamic: {
          children: [{ template: 3 }]
        }
      }
    }
  ])
})

test.todo('component #if', () => {
  const source = `{#if ok}
  <MyComponent />
{/if}`
  expect(source).toBe('todo')
})

test('prefixIdentifiers: true', () => {
  const source1 = `{#if ok}<div>{msg}</div>{/if}`
  const source2 = `<div v-if="ok">{{msg}}</div>`

  const { code, vaporHelpers, ir, helpers } = compileWithVIf(source1, { prefixIdentifiers: true })
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
