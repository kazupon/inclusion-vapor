import { describe, test, expect } from 'vitest'
import { parse } from 'svelte/compiler'
import { convertProps } from './converter'
import { isSvelteElement } from './svelte'
import { NodeTypes, ConstantTypes } from '@vue-vapor/compiler-dom'

import type { SvelteElement } from './svelte'

function getSvelteElement(code: string): SvelteElement | null {
  const ast = parse(code)
  if (ast.html.children == undefined || ast.html.children.length === 0) {
    return null // eslint-disable-line unicorn/no-null
  }
  const el = ast.html.children[0]
  return isSvelteElement(el) ? el : null // eslint-disable-line unicorn/no-null
}

// NOTE:
// we will use the following code for the test:
// - vapor repl: https://vapor-template-explorer.netlify.app/#eyJzcmMiOiI8ZGl2IGlkPVwiYXBwXCIgLz5cbjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBjaGVja2VkIC8+XG48YSA6aHJlZj1cImBwYWdlLyR7cH1gXCI+cGFnZSB7e3B9fTwvYT5cbjxidXR0b24gOmRpc2FibGVkPVwiIWNsaWNrYWJsZVwiPi4uLjwvYnV0dG9uPlxuPGlucHV0IDpyZXF1aXJlZD1cImZhbHNlXCIgLz5cbjxkaXYgOnRpdGxlPVwibnVsbFwiPlRoaXMgZGl2IGhhcyBubyB0aXRsZSBhdHRyaWJ1dGU8L2Rpdj5cbjxidXR0b24gOmRpc2FibGVkPVwibnVtYmVyICE9PSA0MlwiPi4uLjwvYnV0dG9uPlxuPGJ1dHRvbiA6ZGlzYWJsZWQ+Li4uPC9idXR0b24+XG48V2lkZ2V0IDpmb289XCJiYXJcIiA6YW5zd2VyPVwiNDJcIiB0ZXh0PVwiaGVsbG9cIiAvPlxuPFdpZGdldCB2LWJpbmQ9XCJ0aGluZ3NcIiAvPiIsIm9wdGlvbnMiOnt9fQ==
// - svelte repl: https://svelte.dev/repl/26f60c3bdd104519844b674f26dac872?version=4.2.18

describe('convertProps', () => {
  describe('Sevlte Attribute Node', () => {
    test('attribute value: <div id="app" />', () => {
      const el = getSvelteElement('<div id="app" />')
      expect(convertProps(el!)).toMatchObject([
        {
          type: NodeTypes.ATTRIBUTE,
          name: 'id',
          loc: {
            source: 'id="app"'
          },
          nameLoc: {
            source: 'id'
          },
          value: {
            type: NodeTypes.TEXT,
            content: 'app',
            loc: {
              source: '"app"'
            }
          }
        }
      ])
    })

    test('unquoted attribute value: <div id=app />', () => {
      const el = getSvelteElement('<div id=app />')
      expect(convertProps(el!)).toMatchObject([
        {
          type: NodeTypes.ATTRIBUTE,
          name: 'id',
          loc: {
            source: 'id="app"'
          },
          nameLoc: {
            source: 'id'
          },
          value: {
            type: NodeTypes.TEXT,
            content: 'app',
            loc: {
              source: '"app"'
            }
          }
        }
      ])
    })

    test('javascript expression value: <a href="page/{p}"></a>', () => {
      const el = getSvelteElement('<a href="page/{p}"></a>')
      expect(convertProps(el!)).toMatchObject([
        {
          type: NodeTypes.DIRECTIVE,
          name: 'bind',
          rawName: ':href',
          modifiers: [],
          loc: {
            // TODO: we want to map for svelte code correctly...
            // source: 'href="page/{p}"',
          },
          arg: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'href',
            constType: ConstantTypes.CAN_STRINGIFY,
            isStatic: true,
            loc: {
              source: 'href'
            }
          },
          exp: {
            // TODO:
            // ast: undefined,
            type: NodeTypes.SIMPLE_EXPRESSION,
            // TODO: we want to map for svelte code correctly...
            // content: 'page/{p}',
            constType: ConstantTypes.NOT_CONSTANT,
            isStatic: false,
            loc: {
              // TODO: we want to map for svelte code correctly...
              // source: 'page/{p}',
            }
          }
        }
      ])
    })

    test('javascript expression: <button disabled={!clickable}></button>', () => {
      const el = getSvelteElement('<button disabled={!clickable}></button>')
      expect(convertProps(el!)).toMatchObject([
        {
          type: NodeTypes.DIRECTIVE,
          name: 'bind',
          rawName: ':disabled',
          modifiers: [],
          loc: {
            // TODO: we want to map for svelte code correctly...
            // source: 'disabled={!clickable}'
          },
          arg: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'disabled',
            constType: ConstantTypes.CAN_STRINGIFY,
            isStatic: true,
            loc: {
              source: 'disabled'
            }
          },
          exp: {
            // TODO:
            // ast: undefined,
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: '!clickable',
            constType: ConstantTypes.NOT_CONSTANT,
            isStatic: false,
            loc: {
              source: '!clickable'
            }
          }
        }
      ])
    })

    test(`'false' value: <input required={false} />`, () => {
      const el = getSvelteElement('<input required={false} />')
      expect(convertProps(el!)).toMatchObject([
        {
          type: NodeTypes.DIRECTIVE,
          name: 'bind',
          rawName: ':required',
          modifiers: [],
          loc: {
            // TODO: we want to map for svelte code correctly...
            // source: 'required={false}'
          },
          arg: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'required',
            constType: ConstantTypes.CAN_STRINGIFY,
            isStatic: true,
            loc: {
              source: 'required'
            }
          },
          exp: {
            // TODO:
            // ast: undefined,
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'false',
            constType: ConstantTypes.NOT_CONSTANT,
            isStatic: false,
            loc: {
              source: 'false'
            }
          }
        }
      ])
    })

    test(`'null' value: <div title={null} />`, () => {
      const el = getSvelteElement('<div title={null} />')
      expect(convertProps(el!)).toMatchObject([
        {
          type: NodeTypes.DIRECTIVE,
          name: 'bind',
          rawName: ':title',
          modifiers: [],
          loc: {
            // TODO: we want to map for svelte code correctly...
            // source: 'title={null}'
          },
          arg: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'title',
            constType: ConstantTypes.CAN_STRINGIFY,
            isStatic: true,
            loc: {
              source: 'title'
            }
          },
          exp: {
            // TODO:
            // ast: undefined,
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'null',
            constType: ConstantTypes.NOT_CONSTANT,
            isStatic: false,
            loc: {
              source: 'null'
            }
          }
        }
      ])
    })

    test('quoted javascript expression: <button disabled="{number !== 42}"></button>', () => {
      const el = getSvelteElement('<button disabled="{number !== 42}"></button>')
      expect(convertProps(el!)).toMatchObject([
        {
          type: NodeTypes.DIRECTIVE,
          name: 'bind',
          rawName: ':disabled',
          modifiers: [],
          loc: {
            // TODO: we want to map for svelte code correctly...
            // source: 'disabled="{number !== 42}"'
          },
          arg: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'disabled',
            constType: ConstantTypes.CAN_STRINGIFY,
            isStatic: true,
            loc: {
              source: 'disabled'
            }
          },
          exp: {
            // TODO:
            // ast: undefined,
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'number !== 42',
            constType: ConstantTypes.NOT_CONSTANT,
            isStatic: false,
            loc: {
              source: 'number !== 42'
            }
          }
        }
      ])
    })

    test('prop: <Widget foo={bar} answer={42} text="hello" />', () => {
      const el = getSvelteElement('<Widget foo={bar} answer={42} text="hello" />')
      const props = convertProps(el!)
      expect(props[0]).toMatchObject({
        type: NodeTypes.DIRECTIVE,
        name: 'bind',
        rawName: ':foo',
        modifiers: [],
        loc: {
          // TODO: we want to map for svelte code correctly...
          // source: 'foo={bar}'
        },
        arg: {
          type: NodeTypes.SIMPLE_EXPRESSION,
          content: 'foo',
          constType: ConstantTypes.CAN_STRINGIFY,
          isStatic: true,
          loc: {
            source: 'foo'
          }
        },
        exp: {
          // TODO:
          // ast: undefined,
          type: NodeTypes.SIMPLE_EXPRESSION,
          content: 'bar',
          constType: ConstantTypes.NOT_CONSTANT,
          isStatic: false,
          loc: {
            source: 'bar'
          }
        }
      })
      expect(props[1]).toMatchObject({
        type: NodeTypes.DIRECTIVE,
        name: 'bind',
        rawName: ':answer',
        modifiers: [],
        loc: {
          // TODO: we want to map for svelte code correctly...
          // source: 'answer={42}'
        },
        arg: {
          type: NodeTypes.SIMPLE_EXPRESSION,
          content: 'answer',
          constType: ConstantTypes.CAN_STRINGIFY,
          isStatic: true,
          loc: {
            source: 'answer'
          }
        },
        exp: {
          // TODO:
          // ast: undefined,
          type: NodeTypes.SIMPLE_EXPRESSION,
          content: '42',
          constType: ConstantTypes.NOT_CONSTANT,
          isStatic: false,
          loc: {
            source: '42'
          }
        }
      })
      expect(props[2]).toMatchObject({
        type: NodeTypes.ATTRIBUTE,
        name: 'text',
        loc: {
          source: 'text="hello"'
        },
        nameLoc: {
          source: 'text'
        },
        value: {
          type: NodeTypes.TEXT,
          content: 'hello',
          loc: {
            source: '"hello"'
          }
        }
      })
    })
  })

  test('Svelte AttributeShorthand Node: <button {disabled}></button>', () => {
    const el = getSvelteElement('<button {disabled}></button>')
    expect(convertProps(el!)).toMatchObject([
      {
        type: NodeTypes.DIRECTIVE,
        name: 'bind',
        rawName: ':disabled',
        modifiers: [],
        loc: {
          source: 'disabled'
        },
        arg: {
          type: NodeTypes.SIMPLE_EXPRESSION,
          content: 'disabled',
          constType: ConstantTypes.CAN_STRINGIFY,
          isStatic: true,
          loc: {
            source: 'disabled'
          }
        },
        exp: undefined
      }
    ])
  })

  describe('Svelte Spread Attribute Node', () => {
    test('basic: <Widget {...things} />', () => {
      const el = getSvelteElement('<Widget {...things} />')
      expect(convertProps(el!)).toMatchObject([
        {
          type: NodeTypes.DIRECTIVE,
          name: 'bind',
          rawName: 'v-bind',
          modifiers: [],
          loc: {
            // TODO: we want to map for svelte code correctly...
            // source: '{...things}'
          },
          arg: undefined,
          exp: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'things',
            constType: ConstantTypes.NOT_CONSTANT,
            isStatic: false,
            loc: {
              // TODO: we want to map for svelte code correctly...
              // source: '...things',
            }
          }
        }
      ])
    })

    test.todo('$$props: <Widget {...$$props} />')
    test.todo('$$restProps: <input {...$$restProps} />')
  })

  test('no attribute', () => {
    const el = getSvelteElement('<div />')
    expect(convertProps(el!)).toMatchObject([])
  })
})
