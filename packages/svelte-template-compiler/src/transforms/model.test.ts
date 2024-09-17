import { NodeTypes } from '@vue-vapor/compiler-dom'
import { compile as vaporCompile } from '@vue-vapor/compiler-vapor'
import { describe, expect, test } from 'vitest'
import { IRNodeTypes } from '../ir/index.ts'
import { makeCompile } from './_utils.ts'
import { transformVBind } from './bind.ts'
import { transformChildren } from './children.ts'
import { transformComment } from './comment.ts'
import { transformElement } from './element.ts'
import { transformVModel } from './model.ts'
import { transformVOn } from './on.ts'
import { transformText } from './text.ts'

const compileWithVModel = makeCompile({
  prefixIdentifiers: false,
  nodeTransforms: [transformElement, transformChildren, transformText, transformComment],
  directiveTransforms: {
    bind: transformVBind,
    on: transformVOn,
    model: transformVModel
  }
})

describe('bind:property', () => {
  describe('simple binding', () => {
    test('input', () => {
      const source1 = `<input bind:value={text} />`
      const source2 = `<input v-model="text" />`
      const { code, vaporHelpers, ir, helpers } = compileWithVModel(source1)
      const expectedResult = vaporCompile(source2)

      expect(code).toMatchSnapshot('received')
      expect(expectedResult.code).toMatchSnapshot('expected')

      expect(code).contains(`_withDirectives(n0, [[_vModelText, () => text]])`)
      expect(code).contains(`"update:modelValue", () => $event => (text = $event))`)

      expect(vaporHelpers).toContain('vModelText')
      expect(helpers.size).toBe(0)
      expect(ir.template).toEqual(['<input>'])
      expect(ir.block.operation).toMatchObject([
        {
          type: IRNodeTypes.SET_MODEL_VALUE,
          element: 0,
          isComponent: false,
          key: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'modelValue',
            isStatic: true
          },
          value: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: 'text',
            isStatic: false
          }
        },
        {
          type: IRNodeTypes.WITH_DIRECTIVE,
          name: 'vModelText',
          element: 0,
          builtin: true,
          dir: {
            arg: undefined,
            exp: {
              type: NodeTypes.SIMPLE_EXPRESSION,
              content: 'text',
              isStatic: false
            }
          }
        }
      ])
    })

    test.todo('textarea', () => {
      const source1 = `<textarea bind:value={text} />`
      expect(source1).toBe('todo')
    })

    test.todo('checkbox', () => {
      const source1 = `<input type="checkbox" bind:checked={yes} />`
      expect(source1).toBe('todo')
    })
  })

  test.todo('omit property', () => {
    const source1 = `<input bind:value />`
    expect(source1).toBe('todo')
  })

  test.todo('input number', () => {
    const source1 = `<input type="number" bind:value={num} />`
    expect(source1).toBe('todo')
  })

  test.todo('input range', () => {
    const source1 = `<input type="range" bind:value={num} />`
    expect(source1).toBe('todo')
  })

  test.todo('input files', () => {
    const source1 = `<input accept="image/png, image/jpeg" bind:files id="avatar" name="avatar" type="file" />`
    expect(source1).toBe('todo')
  })

  test.todo('with on', () => {
    const source1 = `<input
	on:input={() => console.log('Old value:', value)}
	bind:value
	on:input={() => console.log('New value:', value)}
/>`
    expect(source1).toBe('todo')
  })

  test.todo('component', () => {
    const source1 = `<Keypad bind:value={pin} />`
    expect(source1).toBe('todo')
  })
})

describe.todo('Binding <select> value', () => {
  test('basic', () => {
    const source1 = `<select bind:value={selected}>
	<option value={a}>a</option>
	<option value={b}>b</option>
	<option value={c}>c</option>
</select>`
    expect(source1).toBe('todo')
  })

  test('multiple', () => {
    const source1 = `<select multiple bind:value={fillings}>
	<option value="Rice">Rice</option>
	<option value="Beans">Beans</option>
	<option value="Cheese">Cheese</option>
	<option value="Guac (extra)">Guac (extra)</option>
</select>`
    expect(source1).toBe('todo')
  })

  test('omit value', () => {
    const source1 = `<select multiple bind:value={fillings}>
	<option>Rice</option>
	<option>Beans</option>
	<option>Cheese</option>
	<option>Guac (extra)</option>
</select>`
    expect(source1).toBe('todo')
  })
})

describe.todo('contenteditable', () => {
  test('innerHTML', () => {
    const source1 = `<div contenteditable="true" bind:innerHTML={html} />`
    expect(source1).toBe('todo')
  })

  test('innerText', () => {
    const source1 = `<div contenteditable="true" bind:innerText />`
    expect(source1).toBe('todo')
  })

  test('textContent', () => {
    const source1 = `<div contenteditable="true" bind:textContent={text} />`
    expect(source1).toBe('todo')
  })
})

test.todo('details', () => {
  const source1 = `<details bind:open={isOpen}>
	<summary>Details</summary>
	<p>Something small enough to escape casual notice.</p>
</details>`
  expect(source1).toBe('todo')
})

describe.todo('Media element bindings', () => {
  test('video', () => {
    const source1 = `<video src={clip}
	bind:duration
	bind:buffered
	bind:played
	bind:seekable
	bind:seeking
	bind:ended
	bind:readyState
	bind:currentTime
	bind:playbackRate
	bind:paused
	bind:volume
	bind:muted
	bind:videoWidth
	bind:videoHeight
/>`
    expect(source1).toBe('todo')
  })

  test('audio', () => {})
})

test.todo('Image element bindings', () => {
  const source1 = `<img
	bind:naturalWidth
	bind:naturalHeight
></img>`
  expect(source1).toBe('todo')
})

test.todo('Block-level element bindings', () => {
  const source1 = `<div bind:offsetWidth={width} bind:offsetHeight={height}>
	<Chart {width} {height} />
</div>`
  expect(source1).toBe('todo')
})

test.todo('bind:group', () => {
  const source1 = `<input type="radio" bind:group={tortilla} value="Plain" />
<input type="radio" bind:group={tortilla} value="Whole wheat" />
<input type="radio" bind:group={tortilla} value="Spinach" />`
  expect(source1).toBe('todo')
})

// ... and more!
