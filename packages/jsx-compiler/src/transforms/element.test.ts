import { BindingTypes, NodeTypes } from '@vue-vapor/compiler-dom'
import { compile as vaporCompile } from '@vue-vapor/compiler-vapor'
import { describe, expect, test } from 'vitest'
import { IRNodeTypes } from '../ir/index.ts'
import { makeCompile } from './_utils.ts'
import { transformChildren } from './children.ts'
import { transformElement } from './element.ts'
import { transformText } from './text.ts'

import type { BindingMetadata } from '@vue-vapor/compiler-dom'

const compileWithElementTransform = makeCompile({
  nodeTransforms: [transformElement, transformChildren, transformText]
})

test('native elements', () => {
  const vaporSource = `
<div class="container">
  <div class="header">
    <p style="color: red;">Hello</p>
    <img src="foo.jpg" width="500" height="600" />
    <form action="/submit" method="post">
      <input type="text" />
      <input type="submit" />
    </form>
  </div>
</div>
`
  const jsxSource = `(<>${vaporSource}</>)`
  const { ir: _, code, vaporHelpers } = compileWithElementTransform(jsxSource)
  const expectedResult = vaporCompile(vaporSource)
  expect(code).toMatchSnapshot('jsx')
  expect(expectedResult.code).toMatchSnapshot('vapor')
  // NOTE:
  // There are differences in the handling around spaces and line breaks between vue compiler and jsx compiler.
  // about details, see the snapshot
  // expect(code).toEqual(expectedResult.code)
  expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)
})

describe('component', () => {
  test('basic', () => {
    const vaporSource = `
<div class="container">
  <Foo class="foo"></Foo>
</div>
`
    const jsxSource = `(<>${vaporSource}</>)`
    const { ir: _, code, vaporHelpers } = compileWithElementTransform(jsxSource)
    const expectedResult = vaporCompile(vaporSource)
    expect(code).toMatchSnapshot('jsx')
    expect(expectedResult.code).toMatchSnapshot('vapor')
    expect(code).toEqual(expectedResult.code)
    expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)
  })

  test('import + resolve component', () => {
    const vaporSource = `<Foo/>`
    const jsxSource = `(<>${vaporSource}</>)`
    const { code, ir, vaporHelpers } = compileWithElementTransform(jsxSource)
    const expectedResult = vaporCompile(vaporSource)
    expect(code).toMatchSnapshot('jsx')
    expect(expectedResult.code).toMatchSnapshot('vapor')
    expect(code).toEqual(expectedResult.code)
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

  // TODO: WIP, how should we handle components?
  test('resolve component from setup bindings', () => {
    const vaporSource = `<Example />`
    const jsxSource = `(<>${vaporSource}</>)`
    const { code, ir, vaporHelpers } = compileWithElementTransform(jsxSource, {
      prefixIdentifiers: false,
      bindingMetadata: {
        Example: BindingTypes.SETUP_MAYBE_REF
      }
    })
    const expectedResult = vaporCompile(vaporSource)
    expect(code).toMatchSnapshot('jsx')
    expect(expectedResult.code).toMatchSnapshot('vapor')
    // expect(code).toEqual(expectedResult.code)
    expect(vaporHelpers).not.toContain('resolveComponent')
    expect(ir.block.operation).toMatchObject([
      {
        type: IRNodeTypes.CREATE_COMPONENT_NODE,
        tag: 'Example',
        asset: false
      }
    ])
  })

  // TODO: WIP, how should we handle components?
  test('resolve component from setup bindings (inline)', () => {
    const vaporSource = `<Example />`
    const jsxSource = `(<>${vaporSource}</>)`
    const { code, vaporHelpers } = compileWithElementTransform(jsxSource, {
      inline: true,
      bindingMetadata: {
        Example: BindingTypes.SETUP_MAYBE_REF
      }
    })
    const expectedResult = vaporCompile(vaporSource)
    expect(code).toMatchSnapshot('jsx')
    expect(code).contains(`unref(Example)`)
    expect(expectedResult.code).toMatchSnapshot('vapor')
    expect(vaporHelpers).not.toContain('resolveComponent')
    expect(vaporHelpers).toContain('unref')
  })

  // TODO: WIP, how should we handle components?
  test('resolve component from setup bindings (inline const)', () => {
    const vaporSource = `<Example />`
    const jsxSource = `(<>${vaporSource}</>)`
    const { code, vaporHelpers } = compileWithElementTransform(jsxSource, {
      inline: true,
      bindingMetadata: {
        Example: BindingTypes.SETUP_CONST
      }
    })
    const expectedResult = vaporCompile(vaporSource)
    expect(code).toMatchSnapshot('jsx')
    expect(expectedResult.code).toMatchSnapshot('vapor')
    expect(vaporHelpers).not.toContain('resolveComponent')
  })

  // TODO: WIP, how should we handle components?
  test('resolve namespaced component from setup bindings', () => {
    const vaporSource = `<Foo.Example />`
    const jsxSource = `(<>${vaporSource}</>)`
    const { code, vaporHelpers } = compileWithElementTransform(jsxSource, {
      bindingMetadata: {
        Foo: BindingTypes.SETUP_MAYBE_REF
      }
    })
    const expectedResult = vaporCompile(vaporSource)
    expect(code).toMatchSnapshot('jsx')
    expect(code).contains(`_ctx.Foo.Example`)
    expect(expectedResult.code).toMatchSnapshot('vapor')
    expect(vaporHelpers).not.toContain('resolveComponent')
  })

  // TODO: WIP, how should we handle components?
  test('resolve namespaced component from setup bindings (inline const)', () => {
    const vaporSource = `<Foo.Example />`
    const jsxSource = `(<>${vaporSource}</>)`
    const { code, vaporHelpers } = compileWithElementTransform(jsxSource, {
      inline: true,
      bindingMetadata: {
        Foo: BindingTypes.SETUP_CONST
      }
    })
    const expectedResult = vaporCompile(vaporSource)
    expect(code).toMatchSnapshot('jsx')
    expect(code).contains(`Foo.Example`)
    expect(expectedResult.code).toMatchSnapshot('vapor')
    expect(vaporHelpers).not.toContain('resolveComponent')
  })

  // TODO: WIP, how should we handle components?
  test('resolve namespaced component from props bindings (inline)', () => {
    const vaporSource = `<Foo.Example />`
    const jsxSource = `(<>${vaporSource}</>)`
    const { code, vaporHelpers } = compileWithElementTransform(jsxSource, {
      inline: true,
      bindingMetadata: {
        Foo: BindingTypes.PROPS
      }
    })
    const expectedResult = vaporCompile(vaporSource)
    expect(code).toMatchSnapshot('jsx')
    expect(code).contains(`Foo.Example`)
    expect(expectedResult.code).toMatchSnapshot('vapor')
    expect(vaporHelpers).not.toContain('resolveComponent')
  })

  // TODO: WIP, how should we handle components?
  test('resolve namespaced component from props bindings (non-inline)', () => {
    const vaporSource = `<Foo.Example />`
    const jsxSource = `(<>${vaporSource}</>)`
    const { code, vaporHelpers } = compileWithElementTransform(jsxSource, {
      inline: false,
      bindingMetadata: {
        Foo: BindingTypes.PROPS
      }
    })
    const expectedResult = vaporCompile(vaporSource)
    expect(code).toMatchSnapshot('jsx')
    expect(code).contains('_ctx.Foo.Example')
    expect(expectedResult.code).toMatchSnapshot('vapor')
    expect(vaporHelpers).not.toContain('resolveComponent')
  })

  // TODO: WIP, how should we handle components?
  test('do not resolve component from non-script-setup bindings', () => {
    const bindingMetadata: BindingMetadata = {
      Example: BindingTypes.SETUP_MAYBE_REF
    }
    Object.defineProperty(bindingMetadata, '__isScriptSetup', {
      value: false
    })
    const vaporSource = `<Example />`
    const jsxSource = `(<>${vaporSource}</>)`
    const { code, ir, vaporHelpers } = compileWithElementTransform(jsxSource, {
      bindingMetadata
    })
    const expectedResult = vaporCompile(vaporSource)
    expect(code).toMatchSnapshot('jsx')
    expect(expectedResult.code).toMatchSnapshot('vapor')
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

  // TODO: WIP, how should we handle components?
  test('generate single root component', () => {
    const vaporSource = `<Comp/>`
    const jsxSource = `(<>${vaporSource}</>)`
    const { code } = compileWithElementTransform(jsxSource, {
      bindingMetadata: { Comp: BindingTypes.SETUP_CONST }
    })
    const expectedResult = vaporCompile(vaporSource)
    expect(code).toMatchSnapshot('jsx')
    expect(expectedResult.code).toMatchSnapshot('vapor')
    expect(code).contains('_createComponent(_ctx.Comp, null, null, true)')
  })

  // TODO: WIP, how should we handle components?
  test('generate multi root component', () => {
    const vaporSource = `<Comp/>123`
    const jsxSource = `(<>${vaporSource}</>)`
    const { code } = compileWithElementTransform(jsxSource, {
      bindingMetadata: { Comp: BindingTypes.SETUP_CONST }
    })
    const expectedResult = vaporCompile(vaporSource)
    expect(code).toMatchSnapshot('jsx')
    expect(expectedResult.code).toMatchSnapshot('vapor')
    expect(code).contains('_createComponent(_ctx.Comp)')
  })

  test('static props', () => {
    const vaporSource = `
<Foo id="foo" class="bar" />
`
    const jsxSource = `(<>${vaporSource}</>)`
    const { code, ir } = compileWithElementTransform(jsxSource)
    const expectedResult = vaporCompile(vaporSource)
    expect(code).toMatchSnapshot('jsx')
    expect(expectedResult.code).toMatchSnapshot('vapor')
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
  const vaporSource = `<div id="foo" class="bar" />`
  const jsxSource = `(<>${vaporSource}</>)`
  const { code, ir } = compileWithElementTransform(jsxSource)
  const template = '<div id="foo" class="bar"></div>'
  expect(code).toMatchSnapshot()
  expect(code).contains(JSON.stringify(template))
  expect(ir.template).toMatchObject([template])
  expect(ir.block.effect).lengthOf(0)
})

test('props + children', () => {
  const vaporSource = `<div id="foo"><span/></div>`
  const jsxSource = `(<>${vaporSource}</>)`
  const { code, ir } = compileWithElementTransform(jsxSource)
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
  const { code } = compileWithElementTransform('<></>')
  expect(code).toMatchSnapshot()
  expect(code).contain('return null')
})
