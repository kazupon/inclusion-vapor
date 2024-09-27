import { NodeTypes } from '@vue-vapor/compiler-dom'
import { compile as vaporCompile } from '@vue-vapor/compiler-vapor'
import { expect, test } from 'vitest'
import { IRNodeTypes, IRSlotType } from '../ir/index.ts'
import { makeCompile } from './_utils.ts'
import { transformVBind } from './bind.ts'
import { transformChildren } from './children.ts'
import { transformElement } from './element.ts'
import { transformVFor } from './for.ts'
import { transformVIf } from './if.ts'
import { transformVOn } from './on.ts'
import { transformVSlot } from './slot.ts'
import { transformSlotOutlet } from './slotOutlet.ts'
import { transformText } from './text.ts'

const compileWithSlot = makeCompile({
  prefixIdentifiers: false,
  nodeTransforms: [
    transformText,
    transformVIf,
    transformVFor,
    transformSlotOutlet,
    transformElement,
    transformVSlot,
    transformChildren
  ],
  directiveTransforms: {
    bind: transformVBind,
    on: transformVOn
  }
})

test('implicit default slot on component', () => {
  const source1 = `<Comp><div/></Comp>`
  const source2 = `<Comp><div/></Comp>`

  const { code, ir } = compileWithSlot(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(ir.template).toEqual(['<div></div>'])
  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.CREATE_COMPONENT_NODE,
      id: 1,
      tag: 'Comp',
      props: [[]],
      slots: [
        {
          slotType: IRSlotType.STATIC,
          slots: {
            default: {
              type: IRNodeTypes.BLOCK,
              dynamic: {
                children: [{ template: 0 }]
              }
            }
          }
        }
      ]
    }
  ])
  expect(ir.block.returns).toEqual([1])
  expect(ir.block.dynamic).toMatchObject({
    children: [{ id: 1 }]
  })
})

// NOTE: not support svelte explicit default slot on component?
test.todo('explicit default slot on component', () => {
  const source1 = `<Comp slot="default"><div /></Comp>`
  const source2 = `<Comp v-slot="default"><div /></Comp>`

  const { code, ir } = compileWithSlot(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(ir.template).toEqual(['<div></div>'])
  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.CREATE_COMPONENT_NODE,
      id: 1,
      tag: 'Comp',
      props: [[]],
      slots: [
        {
          slotType: IRSlotType.STATIC,
          slots: {
            default: {
              type: IRNodeTypes.BLOCK,
              dynamic: {
                children: [{ template: 0 }]
              }
            }
          }
        }
      ]
    }
  ])
  expect(ir.block.returns).toEqual([1])
  expect(ir.block.dynamic).toMatchObject({
    children: [{ id: 1 }]
  })
})

test('named slot on component', () => {
  const source1 = `<Comp slot="named" let:bar={ bar }>{ foo + bar }</Comp>`
  const source2 = `<Comp v-slot:named="{ bar }">{{ foo + bar }}</Comp>`

  const { code, ir } = compileWithSlot(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(code).contains(`named: ({ bar }) => {`)
  expect(code).contains(`const n0 = _createTextNode(() => [foo + bar])`)

  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.CREATE_COMPONENT_NODE,
      tag: 'Comp',
      slots: [
        {
          slotType: IRSlotType.STATIC,
          slots: {
            named: {
              type: IRNodeTypes.BLOCK,
              props: {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: '{ bar }'
              }
            }
          }
        }
      ]
    }
  ])
})

test('dynamically named slot on component', () => {
  const source1 = `<Comp slot={ named } let:bar={ bar }>{ foo + bar }</Comp>`
  const source2 = `<Comp v-slot:[named]="{ bar }">{{ foo + bar }}</Comp>`

  const { code, ir } = compileWithSlot(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  // expect(vaporHelpers).contains('withDestructure')
  expect(code).contains(`name: named,`)
  expect(code).contains(`fn: ({ bar }) => {`)
  expect(code).contains(`const n0 = _createTextNode(() => [foo + bar])`)

  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.CREATE_COMPONENT_NODE,
      tag: 'Comp',
      slots: [
        {
          name: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'named',
            isStatic: false
          },
          fn: {
            type: IRNodeTypes.BLOCK,
            props: {
              type: NodeTypes.SIMPLE_EXPRESSION,
              content: '{ bar }'
            }
          }
        }
      ]
    }
  ])
})

test('named slots with implicit default slot', () => {
  const source1 = `<Comp><slot name="one">foo</slot>bar<span /></Comp>`
  const source2 = `<Comp><template #one>foo</template>bar<span /></Comp>`

  const { code, ir } = compileWithSlot(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(ir.template).toEqual(['foo', 'bar', '<span></span>'])
  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.CREATE_COMPONENT_NODE,
      id: 4,
      tag: 'Comp',
      props: [[]],
      slots: [
        {
          slotType: IRSlotType.STATIC,
          slots: {
            one: {
              type: IRNodeTypes.BLOCK,
              dynamic: {
                children: [{ template: 0 }]
              }
            },
            default: {
              type: IRNodeTypes.BLOCK,
              dynamic: {
                children: [{}, { template: 1 }, { template: 2 }]
              }
            }
          }
        }
      ]
    }
  ])
})

test('nested slots scoping', () => {
  const source1 = `<Comp let:foo={ foo }>
  <Inner let:bar={ bar }>
    { foo + bar + baz }
  </Inner>
  { foo + bar + baz }
</Comp>`
  const source2 = `<Comp>
  <template #default="{ foo }">
    <Inner v-slot="{ bar }">
      {{ foo + bar + baz }}
    </Inner>
    {{ foo + bar + baz }}
  </template>
</Comp>`

  const { code, ir } = compileWithSlot(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  // expect(vaporHelpers).contains('withDestructure')
  expect(code).contains(`default: ({ foo }) => {`)
  expect(code).contains(`default: ({ bar }) => {`)
  expect(code).contains(`const n0 = _createTextNode(() => [foo + bar + baz])`)

  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.CREATE_COMPONENT_NODE,
      tag: 'Comp',
      props: [[]],
      slots: [
        {
          slotType: IRSlotType.STATIC,
          slots: {
            default: {
              type: IRNodeTypes.BLOCK,
              props: {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: '{ foo }'
              }
            }
          }
        }
      ]
    }
  ])
  expect(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (ir.block.operation[0] as any).slots[0].slots.default.operation[0]
  ).toMatchObject({
    type: IRNodeTypes.CREATE_COMPONENT_NODE,
    tag: 'Inner',
    slots: [
      {
        slotType: IRSlotType.STATIC,
        slots: {
          default: {
            type: IRNodeTypes.BLOCK,
            props: {
              type: NodeTypes.SIMPLE_EXPRESSION,
              content: '{ bar }'
            }
          }
        }
      }
    ]
  })
})

test('dynamic slots name', () => {
  const source1 = `<Comp slot={ name }>foo</Comp>`
  const source2 = `<Comp>
  <template #[name]>foo</template>
</Comp>`

  const { code, ir } = compileWithSlot(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(ir.block.operation[0].type).toBe(IRNodeTypes.CREATE_COMPONENT_NODE)
  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.CREATE_COMPONENT_NODE,
      tag: 'Comp',
      slots: [
        {
          name: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'name',
            isStatic: false
          },
          fn: { type: IRNodeTypes.BLOCK }
        }
      ]
    }
  ])
})

test.todo('dynamic slots name with #each', () => {
  const source1 = `<Comp>
  {#each items as item}
  <Inner slot={ item } let:bar={ bar }>foo</Inner>
  {/each}
</Comp>`
  const source2 = `<Comp>
  <template v-for="item in items" #[item]="{ bar }">foo</template>
</Comp>`

  const { code, ir } = compileWithSlot(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  // expect(vaporHelpers).contains('withDestructure')
  expect(code).contains(`({ bar }) => [bar]`)

  expect(ir.block.operation[0].type).toBe(IRNodeTypes.CREATE_COMPONENT_NODE)
  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.CREATE_COMPONENT_NODE,
      tag: 'Comp',
      slots: [
        {
          name: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'item',
            isStatic: false
          },
          fn: { type: IRNodeTypes.BLOCK },
          loop: {
            source: { content: 'list' },
            value: { content: 'item' },
            index: undefined
          }
        }
      ]
    }
  ])
})

test.todo('dynamic slots name with #each and provide absent key', () => {
  const source = `<Comp>
  {#each items as item, index}
  <div slot={ index } let:text={ item }>foo</div>
  {/each}
</Comp>`
  expect(source).toBe('todo')
})

test.todo('dynamic slots name with #if, #else-if, #else', () => {
  const source = ''
  expect(source).toBe('todo')
})
