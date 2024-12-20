import { ConstantTypes, NodeTypes } from '@vue-vapor/compiler-dom'
import { parse } from 'svelte/compiler'
import { describe, expect, test } from 'vitest'
import { convertProps } from './converter.ts'
import { isSvelteElement } from './svelte.ts'

import type { SvelteElement } from './svelte.ts'

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
// - vapor repl: https://vapor-template-explorer.netlify.app/#eyJzcmMiOiI8ZGl2IGlkPVwiYXBwXCIgLz5cbjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBjaGVja2VkIC8+XG48YSA6aHJlZj1cImBwYWdlLyR7cH1gXCI+cGFnZSB7e3B9fTwvYT5cbjxidXR0b24gOmRpc2FibGVkPVwiIWNsaWNrYWJsZVwiPi4uLjwvYnV0dG9uPlxuPGlucHV0IDpyZXF1aXJlZD1cImZhbHNlXCIgLz5cbjxkaXYgOnRpdGxlPVwibnVsbFwiPlRoaXMgZGl2IGhhcyBubyB0aXRsZSBhdHRyaWJ1dGU8L2Rpdj5cbjxidXR0b24gOmRpc2FibGVkPVwibnVtYmVyICE9PSA0MlwiPi4uLjwvYnV0dG9uPlxuPGJ1dHRvbiA6ZGlzYWJsZWQ+Li4uPC9idXR0b24+XG48V2lkZ2V0IDpmb289XCJiYXJcIiA6YW5zd2VyPVwiNDJcIiB0ZXh0PVwiaGVsbG9cIiAvPlxuPFdpZGdldCB2LWJpbmQ9XCJ0aGluZ3NcIiAvPlxuXG48YnV0dG9uIHYtb246Y2xpY2s9XCJpbmNyZW1lbnRcIj5DbGljayBtZSE8L2J1dHRvbj5cbjxidXR0b24gQGNsaWNrPVwiKCkgPT4gKGNvdW50ICs9IDEpXCI+Y291bnQ6IHt7Y291bnR9fTwvYnV0dG9uPlxuPGJ1dHRvbiBAY2xpY2s9XCIkZW1pdCgnY2xpY2snKVwiPjwvYnV0dG9uPlxuPGZvcm0gQHN1Ym1pdC5wcmV2ZW50PVwiaGFuZGxlU3VibWl0XCI+PC9mb3JtPiIsIm9wdGlvbnMiOnt9fQ==
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

    test('attribute value (static class) : <div class="static" />', () => {
      const el = getSvelteElement('<div class="static" />')
      expect(convertProps(el!)).toMatchObject([
        {
          type: NodeTypes.ATTRIBUTE,
          name: 'class',
          loc: {
            source: 'class="static"'
          },
          nameLoc: {
            source: 'class'
          },
          value: {
            type: NodeTypes.TEXT,
            content: 'static',
            loc: {
              source: '"static"'
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

  describe('Svelte Class Node', () => {
    test(`expression value: <div class:inactive={!active} />`, () => {
      const el = getSvelteElement(`<div class:inactive={!active} />`)
      expect(convertProps(el!)).toMatchObject([
        {
          type: NodeTypes.DIRECTIVE,
          name: 'bind',
          rawName: ':class',
          modifiers: [],
          loc: {
            source: `:class`
          },
          arg: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'class',
            constType: ConstantTypes.CAN_STRINGIFY,
            isStatic: true,
            loc: {
              source: 'class'
            }
          },
          exp: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: `{ inactive: !active }`,
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

    test('shorthand: <div class:active />', () => {
      const el = getSvelteElement('<div class:active></div>')
      expect(convertProps(el!)).toMatchObject([
        {
          type: NodeTypes.DIRECTIVE,
          name: 'bind',
          rawName: ':class',
          modifiers: [],
          loc: {
            source: ':class'
          },
          arg: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'class',
            constType: ConstantTypes.CAN_STRINGIFY,
            isStatic: true,
            loc: {
              source: 'class'
            }
          },
          exp: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: '{ active: active }',
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

  describe('Svelte EventHandler Node', () => {
    test('basic: <button on:click={increment}></button>', () => {
      const el = getSvelteElement('<button on:click={increment}></button>')
      expect(convertProps(el!)).toMatchObject([
        {
          type: NodeTypes.DIRECTIVE,
          name: 'on',
          rawName: 'v-on:click',
          modifiers: [],
          loc: {
            // TODO: we want to map for svelte code correctly...
            // source: 'on:click={increment}'
          },
          arg: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'click',
            constType: ConstantTypes.CAN_STRINGIFY,
            isStatic: true,
            loc: {
              source: 'click'
            }
          },
          exp: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'increment',
            constType: ConstantTypes.NOT_CONSTANT,
            isStatic: false,
            loc: {
              source: 'increment'
            }
          }
        }
      ])
    })

    test('expression: <button on:click={() => count += 1}></button>', () => {
      const el = getSvelteElement('<button on:click={() => count += 1}></button>')
      expect(convertProps(el!)).toMatchObject([
        {
          type: NodeTypes.DIRECTIVE,
          name: 'on',
          rawName: 'v-on:click',
          modifiers: [],
          loc: {
            // TODO: we want to map for svelte code correctly...
            // source: 'on:click={() => count += 1}'
          },
          arg: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'click',
            constType: ConstantTypes.CAN_STRINGIFY,
            isStatic: true,
            loc: {
              source: 'click'
            }
          },
          exp: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: '() => count += 1',
            constType: ConstantTypes.NOT_CONSTANT,
            isStatic: false,
            loc: {
              source: '() => count += 1'
            }
          }
        }
      ])
    })

    test('modifiers "preventDefault": <form on:submit|preventDefault={handleSubmit}></form>', () => {
      const el = getSvelteElement('<form on:submit|preventDefault={handleSubmit}></form>')
      expect(convertProps(el!)).toMatchObject([
        {
          type: NodeTypes.DIRECTIVE,
          name: 'on',
          rawName: 'v-on:submit.prevent',
          modifiers: [
            {
              type: NodeTypes.SIMPLE_EXPRESSION,
              constType: ConstantTypes.CAN_STRINGIFY,
              content: 'prevent',
              isStatic: true
            }
          ],
          loc: {
            // TODO: we want to map for svelte code correctly...
            // source: 'on:submit|preventDefault={handleSubmit}'
          },
          arg: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'submit',
            constType: ConstantTypes.CAN_STRINGIFY,
            isStatic: true,
            loc: {
              source: 'submit'
            }
          },
          exp: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'handleSubmit',
            constType: ConstantTypes.NOT_CONSTANT,
            isStatic: false,
            loc: {
              source: 'handleSubmit'
            }
          }
        }
      ])
    })

    test.todo('modifiers "stopPropagation"')
    test.todo('modifiers "stopImmediatePropagation"')
    test.todo('modifiers "passive"')
    test.todo('modifiers "nonpassive"')
    test.todo('modifiers "capture"')
    test.todo('modifiers "once"')
    test.todo('modifiers "self"')
    test.todo('modifiers "trusted"')

    test('event forwarding: <button on:click />', () => {
      const el = getSvelteElement('<button on:click />')
      expect(convertProps(el!)).toMatchObject([
        {
          type: NodeTypes.DIRECTIVE,
          name: 'on',
          rawName: 'v-on:click',
          modifiers: [],
          loc: {
            // TODO: we want to map for svelte code correctly...
            // source: 'on:click'
          },
          arg: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'click',
            constType: ConstantTypes.CAN_STRINGIFY,
            isStatic: true,
            loc: {
              source: 'click'
            }
          },
          exp: {
            ast: {
              type: 'CallExpression'
            },
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: "$emit('click')",
            constType: ConstantTypes.NOT_CONSTANT,
            isStatic: false
          }
        }
      ])
    })
  })

  describe('Svelte Binding Node', () => {
    test('basic: <input bind:value={name} />', () => {
      const el = getSvelteElement('<input bind:value={name} />')
      expect(convertProps(el!)).toMatchObject([
        {
          type: NodeTypes.DIRECTIVE,
          name: 'model',
          rawName: 'v-model:value',
          modifiers: [],
          loc: {
            // TODO: we want to map for svelte code correctly...
            source: 'v-model:value="name"'
          },
          arg: undefined,
          exp: {
            // ast: null,
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'name',
            constType: ConstantTypes.NOT_CONSTANT,
            isStatic: false
          }
        }
      ])
    })

    test('type="number": <input type="number" bind:value={count} />', () => {
      const el = getSvelteElement('<input type="number" bind:value={name} />')
      expect(convertProps(el!)).toMatchObject([
        {
          type: NodeTypes.ATTRIBUTE,
          name: 'type'
        },
        {
          type: NodeTypes.DIRECTIVE,
          name: 'model',
          rawName: 'v-model:value.number',
          modifiers: [
            {
              type: NodeTypes.SIMPLE_EXPRESSION,
              constType: ConstantTypes.CAN_STRINGIFY,
              content: 'number',
              isStatic: true
            }
          ],
          loc: {
            // TODO: we want to map for svelte code correctly...
            source: `v-model:value.number="name"`
          },
          arg: undefined,
          exp: {
            // ast: null,
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'name',
            constType: ConstantTypes.NOT_CONSTANT,
            isStatic: false
          }
        }
      ])
    })

    test('multiple bindings: <MyComp bind:foo={buz} bind:bar />', () => {
      const el = getSvelteElement('<MyComp bind:foo={buz} bind:bar />')
      expect(convertProps(el!)).toMatchObject([
        {
          type: NodeTypes.DIRECTIVE,
          name: 'model',
          rawName: 'v-model:foo',
          loc: {
            // TODO: we want to map for svelte code correctly...
            source: `v-model:foo="buz"`
          },
          arg: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'foo',
            constType: ConstantTypes.CAN_STRINGIFY,
            isStatic: true
          },
          exp: {
            // ast: null,
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'buz',
            constType: ConstantTypes.NOT_CONSTANT,
            isStatic: false
          }
        },
        {
          type: NodeTypes.DIRECTIVE,
          name: 'model',
          rawName: 'v-model:bar',
          loc: {
            // TODO: we want to map for svelte code correctly...
            source: `v-model:bar`
          },
          arg: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'bar',
            constType: ConstantTypes.CAN_STRINGIFY,
            isStatic: true
          },
          exp: {
            // ast: null,
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'bar',
            constType: ConstantTypes.NOT_CONSTANT,
            isStatic: false
          }
        }
      ])
    })

    test('bind:this: native element', () => {
      const el = getSvelteElement('<canvas bind:this={el} />')
      expect(convertProps(el!)).toMatchObject([])
    })

    test('bind:this: component', () => {
      const el = getSvelteElement('<MyComp bind:this={el} />')
      expect(convertProps(el!)).toMatchObject([])
    })
  })

  describe('Svelte ComponentTag Node', () => {
    test('basic: <svelte:component this={Comp1} foo={bar} />', () => {
      const el = getSvelteElement(`<svelte:component this={Comp1} foo={bar} />`)
      expect(convertProps(el!)).toMatchObject([
        {
          type: NodeTypes.DIRECTIVE,
          name: 'bind',
          rawName: ':foo',
          modifiers: [],
          loc: {
            // TODO: we want to map for svelte code correctly...
            source: 'foo="bar"'
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
            // TODO: we want to map for svelte code correctly...
            content: 'bar',
            constType: ConstantTypes.NOT_CONSTANT,
            isStatic: false,
            loc: {
              // TODO: we want to map for svelte code correctly...
              // source: 'foo',
            }
          }
        },
        {
          type: NodeTypes.DIRECTIVE,
          name: 'bind',
          rawName: ':this',
          modifiers: [],
          loc: {
            source: 'this="Comp1"'
          },
          arg: undefined,
          exp: {
            ast: {},
            type: NodeTypes.SIMPLE_EXPRESSION,
            // TODO: we want to map for svelte code correctly...
            content: 'Comp1',
            constType: ConstantTypes.NOT_CONSTANT,
            isStatic: false,
            loc: {
              // TODO: we want to map for svelte code correctly...
              source: 'Comp1'
            }
          }
        }
      ])
    })
  })

  test('no attribute', () => {
    const el = getSvelteElement('<div />')
    expect(convertProps(el!)).toMatchObject([])
  })
})
