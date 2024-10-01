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
    transformVIf,
    transformVFor,
    transformSlotOutlet,
    transformText,
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

test('explicit default slot on component', () => {
  const source1 = `<Comp slot="default"><div /></Comp>`
  const source2 = `<Comp v-slot:default><div /></Comp>`

  const { code, ir } = compileWithSlot(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(ir.template).toEqual(['<div></div>'])
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

test('named slot on element', () => {
  const source1 = `<Comp>
  <h1 slot="greeting">Hello</h1>
</Comp>`
  const source2 = `<Comp>
  <template v-slot:greeting><h1>Hello</h1></template>
</Comp>`

  const { code, ir } = compileWithSlot(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(ir.template).toEqual(['<h1>Hello</h1>'])
  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.CREATE_COMPONENT_NODE,
      tag: 'Comp',
      props: [[]],
      slots: [
        {
          slotType: IRSlotType.STATIC,
          slots: {
            greeting: {
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
})

test('named slots on multiple elements', () => {
  const source1 = `<Comp>
  <h1 slot="header">Hello</h1>
  <p slot="footer">copyright</p>
</Comp>`
  const source2 = `<Comp>
	<template #header><h1>Hello</h1></template>
	<template #footer><p>copyright</p></template>
</Comp>`

  const { code, ir } = compileWithSlot(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  // TODO: white space
  expect(ir.template).toEqual(['<h1>Hello</h1>', ' ', '<p>copyright</p>'])
  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.CREATE_COMPONENT_NODE,
      tag: 'Comp',
      props: [[]],
      slots: [
        {
          slotType: IRSlotType.STATIC,
          slots: {
            header: {
              type: IRNodeTypes.BLOCK,
              dynamic: {
                children: [{ template: 0 }]
              }
            },
            footer: {
              type: IRNodeTypes.BLOCK,
              dynamic: {
                // TODO: white space
                // children: [{ template: 1 }]
                children: [{ template: 2 }]
              }
            }
          }
        }
      ]
    }
  ])
})

test('complex named slots (mixed element, components and text)', () => {
  const source1 = `<Comp>
  <h1>title</h1>
  <header slot="header">Header</header>
  <div>contents: <span>content</span></div>
  <Footer slot="footer" />
</Comp>`
  const source2 = `<Comp>
  <h1>title</h1>
	<template #header><header>Header</header></template>
  <div>contents: <span>content</span></div>
	<template #footer><Footer /></template>
</Comp>`

  const { code, ir } = compileWithSlot(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  // TODO: white space
  expect(ir.template).toEqual([
    '<h1>title</h1>',
    ' ',
    '<header>Header</header>',
    '<div>contents: <span>content</span></div>'
  ])

  expect(code).contains(`header: () => {`)
  expect(code).contains(`footer: () => {`)
  expect(code).contains(`_createComponent(_component_Footer)`)
  expect(code).contains(`default: () => {`)

  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.CREATE_COMPONENT_NODE,
      tag: 'Comp',
      slots: [
        {
          slotType: IRSlotType.STATIC,
          slots: {
            header: {
              type: IRNodeTypes.BLOCK
            },
            footer: {
              type: IRNodeTypes.BLOCK
            },
            default: {
              type: IRNodeTypes.BLOCK
            }
          }
        }
      ]
    }
  ])
})

test('named slot on component', () => {
  const source1 = `<Comp slot="named" let:bar>{ foo + bar }</Comp>`
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

test('named slot on multiple components', () => {
  const source1 = `<Comp>
  <Hello slot="foo" />
  <World slot="bar" />
</Comp>`
  const source2 = `<Comp>
  <template #foo><Hello /></template>
  <template #bar><World /></template>
</Comp>`

  const { code, ir } = compileWithSlot(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(code).contains(`foo: () => {`)
  expect(code).contains(`bar: () => {`)

  // TOOD: white space
  // expect(ir.template).toEqual([])
  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.CREATE_COMPONENT_NODE,
      tag: 'Comp',
      props: [[]],
      slots: [
        {
          slotType: IRSlotType.STATIC,
          slots: {
            foo: {
              type: IRNodeTypes.BLOCK
            },
            bar: {
              type: IRNodeTypes.BLOCK
            }
          }
        }
      ]
    }
  ])
})

test('dynamically named slot on element', () => {
  const source1 = `<Comp>
  <h1 slot={named}>Hello</h1>
</Comp>`
  const source2 = `<Comp>
  <template v-slot:[named]><h1>Hello</h1></template>
</Comp>`

  const { code, ir } = compileWithSlot(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  // expect(vaporHelpers).contains('withDestructure')
  expect(code).contains(`name: named,`)
  expect(code).contains(`fn: () => {`)

  expect(ir.template).toEqual(['<h1>Hello</h1>'])
  expect(ir.block.operation).toMatchObject([
    {
      type: IRNodeTypes.CREATE_COMPONENT_NODE,
      tag: 'Comp',
      props: [[]],
      slots: [
        {
          slotType: IRSlotType.DYNAMIC,
          name: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'named',
            isStatic: false
          },
          fn: {
            type: IRNodeTypes.BLOCK,
            props: undefined
          }
        }
      ]
    }
  ])
})

test('dynamically named slot on component', () => {
  const source1 = `<Comp slot={ named } let:bar>{ foo + bar }</Comp>`
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
      props: [[]],
      slots: [
        {
          slotType: IRSlotType.DYNAMIC,
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
  const source1 = `<Comp><h1 slot="one">foo</h1>bar<span /></Comp>`
  const source2 = `<Comp><template #one><h1>foo</h1></template>bar<span /></Comp>`

  const { code, ir } = compileWithSlot(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(ir.template).toEqual(['<h1>foo</h1>', 'bar', '<span></span>'])
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

test('slot outlets chain', () => {
  const source = `<Comp><slot>outlets</slot></Comp>`

  const { code, ir } = compileWithSlot(source)
  const expectedResult = vaporCompile(source)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(code).contain(`_createSlot("default", null, () => {`)

  expect(ir.template).toEqual(['outlets'])
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
              type: IRNodeTypes.BLOCK
            }
          }
        }
      ]
    }
  ])
})

test('<svelte:fragment>', () => {
  const source1 = `<Comp><svelte:fragment slot="one">foo</svelte:fragment>bar<span /></Comp>`
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
  const source1 = `<Comp let:foo>
  <Inner let:bar>
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

test('let alias', () => {
  const source1 = `<Comp slot="named" let:bar={ foo }>{ foo }</Comp>`
  const source2 = `<Comp v-slot:named="{ bar: foo }">{{ foo }}</Comp>`

  const { code } = compileWithSlot(source1)
  const expectedResult = vaporCompile(source2)

  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')

  expect(code).contains(`named: ({ bar: foo }) => {`)
})

test('let object destructuring', () => {
  const source = `<Comp slot="named" let:item={{ id }}>{ id }</Comp>`

  const { code } = compileWithSlot(source)

  expect(code).toMatchSnapshot('received')
  expect(code).contains(`named: ({ item: { id } }) => {`)
})

test('let array destructuring', () => {
  const source = `<Comp slot="named" let:item={[a, b]}>{ a + b }</Comp>`

  const { code } = compileWithSlot(source)

  expect(code).toMatchSnapshot('received')
  expect(code).contains(`named: ({ item: [ a, b ] }) => {`)
})

test.todo('let multiple', () => {
  const source = `<Comp slot="named" let:item let:bar={ buz } let:dio={[a, b]}></Comp>`

  const { code } = compileWithSlot(source)

  expect(code).toMatchSnapshot('received')
  expect(code).contains(`named: ({ item, bar: buz, dio: [ a, b ] }) => {`)
})

test('let on <svelte:fragment>', () => {
  const source = `<Comp><svelte:fragment slot="one" let:foo>foo</svelte:fragment>bar<span /></Comp>`

  const { code } = compileWithSlot(source)

  expect(code).toMatchSnapshot('received')
  expect(code).contains(`one: ({ foo }) => {`)
})

test.todo('dynamic slots name with #each', () => {
  const source1 = `<Comp>
  {#each items as item}
  <Inner slot={ item } let:bar>foo</Inner>
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
  <div slot={ index } let:text>foo</div>
  {/each}
</Comp>`
  expect(source).toBe('todo')
})

test.todo('dynamic slots name with #if, #else-if, #else', () => {
  const source = ''
  expect(source).toBe('todo')
})
