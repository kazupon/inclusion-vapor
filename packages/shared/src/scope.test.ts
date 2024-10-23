import { babelParse, walkAST } from 'ast-kit'
import { describe, expect, test } from 'vitest'
import { analyze } from './scope.ts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pojo(obj: any): any {
  return JSON.parse(JSON.stringify(obj)) // eslint-disable-line unicorn/prefer-structured-clone
}

describe('anaylze', () => {
  test('basic', () => {
    const program = babelParse(`
      const a = b
    `)
    const { globals, scope } = analyze(program)
    expect(globals.size).toBe(1)
    expect(globals.has('b')).toBe(true)
    expect(scope.declarations.size).toBe(1)
    expect(scope.declarations.has('a')).toBe(true)
    expect(scope.references.size).toBe(2)
    expect(scope.references.has('a')).toBe(true)
    expect(scope.references.has('b')).toBe(true)

    const a = scope.declarations.get('a')
    expect(pojo(a)).toMatchObject({
      type: 'VariableDeclaration',
      kind: 'const',
      declarations: [
        {
          type: 'VariableDeclarator',
          id: {
            type: 'Identifier',
            name: 'a'
          },
          init: {
            type: 'Identifier',
            name: 'b'
          }
        }
      ]
    })
  })

  test('extracts all references', () => {
    const program = babelParse(`
    function foo() {
      const bar = 1
      baz()
    }
    `)
    const { scope } = analyze(program)
    expect(scope.references).toEqual(new Set(['foo', 'bar', 'baz']))
  })

  test('tracks all scopes', () => {
    const program = babelParse(`
    function foo() {}
			const bar = function bar() {};
			const baz = () => {};
			for (let i = 0; i < 10; ++i) {}
			for (let k in obj) {}
			for (let v of obj) {}
			try {} catch (e) {}
			switch (baz) {
				case 1:
					break;
				case 2: {
					break;
				}
			}
    `)

    const { map } = analyze(program)
    const scopes = []

    walkAST(program, {
      enter(node) {
        if (map.has(node)) {
          scopes.push(node)
        }
      }
    })

    expect(scopes.length).toBe(17)
  })
})
