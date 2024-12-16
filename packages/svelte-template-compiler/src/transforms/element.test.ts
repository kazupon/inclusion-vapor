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
  nodeTransforms: [transformText, transformElement, transformChildren]
})

describe('native elements', () => {
  test('basic', () => {
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

    expect(code).toMatchSnapshot('svelte')
    expect(expectedResult.code).toMatchSnapshot('vue')

    // NOTE:
    // There are differences in the handling around spaces and line breaks between Vue compiler and Svelte compiler.
    // about details, see the snapshot
    // expect(code).toEqual(expectedResult.code)
    expect(vaporHelpers).toEqual(expectedResult.vaporHelpers)
  })

  test('static attributes', () => {
    const source = `<div id="foo" />`
    const { code, ir } = compileWithElementTransform(source)
    const expectedResult = vaporCompile(source)

    expect(code).toMatchSnapshot('svelte')
    expect(expectedResult.code).toMatchSnapshot('vue')

    expect(ir.template).toEqual([`<div id="foo"></div>`])
    expect(ir.block.effect).lengthOf(0)
  })

  test('attributes + children', () => {
    const source = `<div id="foo"><span/></div>`

    const { code, ir } = compileWithElementTransform(source)
    const expectedResult = vaporCompile(source)

    expect(code).toMatchSnapshot('svelte')
    expect(expectedResult.code).toMatchSnapshot('vue')

    expect(ir.template).toEqual([`<div id="foo"><span></span></div>`])
    expect(ir.block.effect).lengthOf(0)
  })

  test('static class', () => {
    const source = `<div class="foo">hello</div>`

    const { code, ir } = compileWithElementTransform(source)
    const expectedResult = vaporCompile(source)

    expect(code).toMatchSnapshot('svelte')
    expect(expectedResult.code).toMatchSnapshot('vue')

    expect(ir.template).toEqual([`<div class="foo">hello</div>`])
  })

  test('static style', () => {
    const source = `<div style="color: red;">hello</div>`

    const { code, ir } = compileWithElementTransform(source)
    const expectedResult = vaporCompile(source)

    expect(code).toMatchSnapshot('svelte')
    expect(expectedResult.code).toMatchSnapshot('vue')

    expect(ir.template).toEqual([`<div style="color: red;">hello</div>`])
  })
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

    expect(code).toMatchSnapshot('svelte')
    expect(expectedResult.code).toMatchSnapshot('vue')

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

  describe('dynamic component', () => {
    test('dynamic binding', () => {
      const { code, ir, vaporHelpers } = compileWithElementTransform(
        `<svelte:component this={foo}></svelte:component>`
      )
      expect(code).toMatchSnapshot()
      expect(vaporHelpers).toContain('resolveDynamicComponent')
      expect(ir.block.operation).toMatchObject([
        {
          type: IRNodeTypes.CREATE_COMPONENT_NODE,
          tag: 'component',
          asset: true,
          root: true,
          // TODO:
          // props: [[]],
          dynamic: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'foo',
            isStatic: false
          }
        }
      ])
    })
  })

  test('static props', () => {
    const source = `
<Foo id="foo" class="bar" />
`

    const { code, ir } = compileWithElementTransform(source)
    const expectedResult = vaporCompile(source)

    expect(code).toMatchSnapshot('svelte')
    expect(expectedResult.code).toMatchSnapshot('vue')

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

test('empty template', () => {
  const { code } = compileWithElementTransform('')

  expect(code).toMatchSnapshot()
  expect(code).contain('return null')
})

test('scoped css', () => {
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
<style>
.container {
  color: blue;
}
p {
  color: green;
}
div.header {
  color: yellow;
}
:global(from) {
  color: purple;
}
</style>
`
  const {
    ir: _,
    code,
    vaporHelpers: __
  } = compileWithElementTransform(source, { scopeId: 'svelte-xxx' })

  expect(code).toMatchSnapshot()
})
