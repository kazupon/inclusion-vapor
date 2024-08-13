import { describe, expect, test } from 'vitest'
import { makeCompile } from './_utils'
import { transformElement } from './transformElement'
import { transformChildren } from './transformChildren'
import { transformText } from './transformText'
import { IRNodeTypes } from '../ir'
import { compile as vaporCompile } from '@vue-vapor/compiler-vapor'
import { NodeTypes, BindingTypes } from '@vue-vapor/compiler-dom'

import type { BindingMetadata } from '@vue-vapor/compiler-dom'

const compileWithElementTransform = makeCompile({
  nodeTransforms: [transformElement, transformChildren, transformText]
})

test('native elements', () => {
  const source = `
<div class="container">
  <div class="header">
    <p style="color: red;">Hello</p>
    <img src="foo.jpg" width="500" height="600">
    <form action="/submit" method="post">
      <input type="text" />
      <input type="submit">
    </form>
  </div>
</div>
`
  const { ir: _, code, vaporHelpers } = compileWithElementTransform(source)
  const expectedResult = vaporCompile(source)
  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')
  // NOTE:
  // There are differences in the handling around spaces and line breaks between Vue compiler and Svelte compiler.
  // about details, see the snapshot
  // expect(code).toEqual(expectedResult.code)
  expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)
})

describe('component', () => {
  test('basic', () => {
    const source = `
<div class="container">
  <Foo class="foo"></Foo>
</div>
`
    const { ir: _, code, vaporHelpers } = compileWithElementTransform(source)
    const expectedResult = vaporCompile(source)
    expect(code).toMatchSnapshot('received')
    expect(expectedResult.code).toMatchSnapshot('expected')
    expect(code).toEqual(expectedResult.code)
    expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)
  })

  test('import + resolve component', () => {
    const { code, ir, vaporHelpers } = compileWithElementTransform(`<Foo/>`)
    expect(code).toMatchSnapshot()
    expect(vaporHelpers).contains.all.keys('resolveComponent', 'createComponent')
    expect(ir.block.operation).toMatchObject([
      {
        type: IRNodeTypes.CREATE_COMPONENT_NODE,
        id: 0,
        tag: 'Foo',
        asset: true,
        root: true,
        props: [[]]
      }
    ])
  })

  test('resolve component from setup bindings', () => {
    const { code, ir, vaporHelpers } = compileWithElementTransform(`<Example />`, {
      bindingMetadata: {
        Example: BindingTypes.SETUP_MAYBE_REF
      }
    })
    expect(code).toMatchSnapshot()
    expect(vaporHelpers).not.toContain('resolveComponent')
    expect(ir.block.operation).toMatchObject([
      {
        type: IRNodeTypes.CREATE_COMPONENT_NODE,
        tag: 'Example',
        asset: false
      }
    ])
  })

  test('resolve component from setup bindings (inline)', () => {
    const { code, vaporHelpers } = compileWithElementTransform(`<Example/>`, {
      inline: true,
      bindingMetadata: {
        Example: BindingTypes.SETUP_MAYBE_REF
      }
    })
    expect(code).toMatchSnapshot()
    expect(code).contains(`unref(Example)`)
    expect(vaporHelpers).not.toContain('resolveComponent')
    expect(vaporHelpers).toContain('unref')
  })

  test('resolve component from setup bindings (inline const)', () => {
    const { code, vaporHelpers } = compileWithElementTransform(`<Example/>`, {
      inline: true,
      bindingMetadata: {
        Example: BindingTypes.SETUP_CONST
      }
    })
    expect(code).toMatchSnapshot()
    expect(vaporHelpers).not.toContain('resolveComponent')
  })

  test('resolve namespaced component from setup bindings', () => {
    const { code, vaporHelpers } = compileWithElementTransform(`<Foo.Example/>`, {
      bindingMetadata: {
        Foo: BindingTypes.SETUP_MAYBE_REF
      }
    })
    expect(code).toMatchSnapshot()
    expect(code).contains(`_ctx.Foo.Example`)
    expect(vaporHelpers).not.toContain('resolveComponent')
  })

  test('resolve namespaced component from setup bindings (inline const)', () => {
    const { code, vaporHelpers } = compileWithElementTransform(`<Foo.Example/>`, {
      inline: true,
      bindingMetadata: {
        Foo: BindingTypes.SETUP_CONST
      }
    })
    expect(code).toMatchSnapshot()
    expect(code).contains(`Foo.Example`)
    expect(vaporHelpers).not.toContain('resolveComponent')
  })

  test('resolve namespaced component from props bindings (inline)', () => {
    const { code, vaporHelpers } = compileWithElementTransform(`<Foo.Example/>`, {
      inline: true,
      bindingMetadata: {
        Foo: BindingTypes.PROPS
      }
    })
    expect(code).toMatchSnapshot()
    expect(code).contains(`Foo.Example`)
    expect(vaporHelpers).not.toContain('resolveComponent')
  })

  test('resolve namespaced component from props bindings (non-inline)', () => {
    const { code, vaporHelpers } = compileWithElementTransform(`<Foo.Example/>`, {
      inline: false,
      bindingMetadata: {
        Foo: BindingTypes.PROPS
      }
    })
    expect(code).toMatchSnapshot()
    expect(code).contains('_ctx.Foo.Example')
    expect(vaporHelpers).not.toContain('resolveComponent')
  })

  test('do not resolve component from non-script-setup bindings', () => {
    const bindingMetadata: BindingMetadata = {
      Example: BindingTypes.SETUP_MAYBE_REF
    }
    Object.defineProperty(bindingMetadata, '__isScriptSetup', {
      value: false
    })
    const { code, ir, vaporHelpers } = compileWithElementTransform(`<Example/>`, {
      bindingMetadata
    })
    expect(code).toMatchSnapshot()
    expect(vaporHelpers).toContain('resolveComponent')
    expect(ir.block.operation).toMatchObject([
      {
        type: IRNodeTypes.CREATE_COMPONENT_NODE,
        id: 0,
        tag: 'Example',
        asset: true
      }
    ])
  })

  test('generate single root component', () => {
    const { code } = compileWithElementTransform(`<Comp/>`, {
      bindingMetadata: { Comp: BindingTypes.SETUP_CONST }
    })
    expect(code).toMatchSnapshot()
    expect(code).contains('_createComponent(_ctx.Comp, null, null, true)')
  })

  test('generate multi root component', () => {
    const { code } = compileWithElementTransform(`<Comp/>123`, {
      bindingMetadata: { Comp: BindingTypes.SETUP_CONST }
    })
    expect(code).toMatchSnapshot()
    expect(code).contains('_createComponent(_ctx.Comp)')
  })

  test('static props', () => {
    const source = `
<Foo id="foo" class="bar" />
`
    const { code, ir } = compileWithElementTransform(source)
    const expectedResult = vaporCompile(source)
    expect(code).toMatchSnapshot('received')
    expect(expectedResult.code).toMatchSnapshot('expected')
    expect(code).toEqual(expectedResult.code)

    expect(ir.block.operation).toMatchObject([
      {
        type: IRNodeTypes.CREATE_COMPONENT_NODE,
        tag: 'Foo',
        asset: true,
        root: true,
        props: [
          [
            {
              key: {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: 'id',
                isStatic: true
              },
              values: [
                {
                  type: NodeTypes.SIMPLE_EXPRESSION,
                  content: 'foo',
                  isStatic: true
                }
              ]
            },
            {
              key: {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: 'class',
                isStatic: true
              },
              values: [
                {
                  type: NodeTypes.SIMPLE_EXPRESSION,
                  content: 'bar',
                  isStatic: true
                }
              ]
            }
          ]
        ]
      }
    ])
  })
})

test('static props', () => {
  const { code, ir } = compileWithElementTransform(`<div id="foo" class="bar" />`)

  const template = '<div id="foo" class="bar"></div>'
  expect(code).toMatchSnapshot()
  expect(code).contains(JSON.stringify(template))
  expect(ir.template).toMatchObject([template])
  expect(ir.block.effect).lengthOf(0)
})

test('props + children', () => {
  const { code, ir } = compileWithElementTransform(`<div id="foo"><span/></div>`)

  const template = '<div id="foo"><span></span></div>'
  expect(code).toMatchSnapshot()
  expect(code).contains(JSON.stringify(template))
  expect(ir.template).toMatchObject([template])
  expect(ir.block.effect).lengthOf(0)
})

test.skip('invalid html nesting', () => {
  const source = `
<p><div>123</div></p>
<form><form/></form>
`
  const { ir, code, vaporHelpers: _ } = compileWithElementTransform(source)
  const expectedResult = vaporCompile(source)
  expect(code).toMatchSnapshot('received')
  expect(expectedResult.code).toMatchSnapshot('expected')
  expect(code).toEqual(expectedResult.code)

  expect(ir.template).toEqual(['<div>123</div>', '<p></p>', '<form></form>'])
  expect(ir.block.dynamic).toMatchObject({
    children: [
      { id: 1, template: 1, children: [{ id: 0, template: 0 }] },
      { id: 3, template: 2, children: [{ id: 2, template: 2 }] }
    ]
  })

  expect(ir.block.operation).toMatchObject([
    { type: IRNodeTypes.INSERT_NODE, parent: 1, elements: [0] },
    { type: IRNodeTypes.INSERT_NODE, parent: 3, elements: [2] }
  ])
})

test('empty template', () => {
  const { code } = compileWithElementTransform('')
  expect(code).toMatchSnapshot()
  expect(code).contain('return null')
})
