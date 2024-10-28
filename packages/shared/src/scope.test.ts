import { babelParse, walkAST } from 'ast-kit'
import { describe, expect, test } from 'vitest'
import { analyze, getReferences } from './scope.ts'

import type { Scope } from './scope.ts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pojo(obj: any): any {
  return JSON.parse(JSON.stringify(obj)) // eslint-disable-line unicorn/prefer-structured-clone
}

describe('anaylze', () => {
  test('simple variable decralation', () => {
    const program = babelParse(`
      const a = b
    `)
    const { globals, scope } = analyze(program)
    expect(globals.size).toBe(1)
    expect(globals.has('b')).toBe(true)
    expect(scope.parent).toBeNull()
    expect(scope.children.length).toBe(0)
    expect(scope.block).toBe(program)
    expect(scope.variables.size).toBe(1)
    expect(scope.variables.has('a')).toBe(true)
    expect(scope.references.length).toBe(2)
    expect(scope.references.map(node => node.name).sort()).toEqual(['a', 'b'].sort())

    const a = scope.getVariable('a')
    expect(pojo(a?.identifier)).toMatchObject({
      type: 'Identifier',
      name: 'a'
    })
    expect(a?.definition.kind).toBe('const')
    expect(a?.definition.node).toMatchObject({
      type: 'VariableDeclarator',
      init: {
        type: 'Identifier',
        name: 'b'
      }
    })
    expect(a?.references.size).toBe(1)
  })

  test('ImportDefaultSpecifier, ImportSpecifier', () => {
    const program = babelParse(`
      import { a, b as c } from 'foo'
      import { default as d } from 'bar'
      import e from 'baz'
      console.log(a, c, d, e)
    `)
    const { scope } = analyze(program)
    expect(scope.variables.size).toBe(4)
    expect(scope.variables.has('a')).toBe(true)
    expect(scope.variables.has('c')).toBe(true)
    expect(scope.variables.has('d')).toBe(true)
    expect(scope.variables.has('e')).toBe(true)
    const a = scope.getVariable('a')
    expect(a?.definition.kind).toBe('import')
    expect(a?.definition.node.type).toBe('ImportDeclaration')
    expect(a?.references.size).toBe(2)
    expect(scope.variables.get('c')?.references.size).toBe(2)
    expect(scope.variables.get('d')?.references.size).toBe(2)
    expect(scope.variables.get('e')?.references.size).toBe(2)
    expect(scope.references.length).toBe(9)
  })

  test('ExportDefaultDeclaration', () => {
    const program = babelParse(`
      let foo = 1
      export default foo
    `)
    const { scope } = analyze(program)
    expect(scope.variables.size).toBe(1)
    expect(scope.variables.has('foo')).toBe(true)
    expect(scope.variables.get('foo')?.references.size).toBe(2)
    const foo = scope.getVariable('foo')
    expect(foo?.definition.kind).toBe('let')
    expect(scope.references.length).toBe(2)
  })

  test('ExportNamedDeclaration', () => {
    const program = babelParse(`
      const foo = 1
      export const bar = 1
      export { foo }
    `)
    const { map, scope: rootScope } = analyze(program)
    const scopes = [] as Scope[]
    walkAST(program, {
      enter(node) {
        if (map.has(node)) {
          scopes.push(map.get(node) as Scope)
        }
      }
    })

    const last = scopes.at(-1) as Scope
    expect(last.variables.size).toBe(0)
    expect(last.references.length).toBe(1)

    expect(rootScope.children.length).toBe(1)
    expect(rootScope.variables.size).toBe(2)
    expect(rootScope.variables.has('foo')).toBe(true)
    expect(rootScope.variables.has('bar')).toBe(true)
    expect(rootScope.variables.get('foo')?.references.size).toBe(2)
    expect(rootScope.variables.get('bar')?.references.size).toBe(1)
    expect(rootScope.references.length).toBe(2)
  })

  test('FunctionDeclaration', () => {
    const program = babelParse(`
      const foo = 1
      function bar(a, b, c) {
        const d = foo
        console.log(d, b, c)
      }
    `)
    const { map, scope: rootScope } = analyze(program)

    const scopes = [] as Scope[]
    walkAST(program, {
      enter(node) {
        if (map.has(node)) {
          scopes.push(map.get(node) as Scope)
        }
      }
    })
    expect(scopes.length).toBe(1)

    const last = scopes.at(-1) as Scope
    expect(last.variables.size).toBe(4)
    expect(last.variables.has('a')).toBe(true)
    expect(last.variables.has('b')).toBe(true)
    expect(last.variables.has('c')).toBe(true)
    expect(last.variables.has('d')).toBe(true)
    expect(last.variables.get('a')?.references.size).toBe(1)
    expect(last.variables.get('b')?.references.size).toBe(2)
    expect(last.variables.get('c')?.references.size).toBe(2)
    expect(last.variables.get('d')?.references.size).toBe(2)
    expect(last.references.length).toBe(9)

    expect(rootScope.children.length).toBe(1)
    expect(rootScope.variables.size).toBe(2)
    expect(rootScope.variables.has('foo')).toBe(true)
    expect(rootScope.variables.has('bar')).toBe(true)
    expect(rootScope.variables.get('foo')?.references.size).toBe(2)
    expect(rootScope.variables.get('bar')?.references.size).toBe(0)
    expect(rootScope.references.length).toBe(1)

    const bar = rootScope.getVariable('bar')
    expect(bar?.definition.kind).toBe('function')
    expect(bar?.definition.node.type).toBe('FunctionDeclaration')
  })

  test('FunctionExpression', () => {
    const program = babelParse(`
      const foo = 1
      const bar = function (a, b, c) {
        const d = foo
        console.log(d, b, c)
      }
    `)
    const { map, scope: rootScope } = analyze(program)

    const scopes = [] as Scope[]
    walkAST(program, {
      enter(node) {
        if (map.has(node)) {
          scopes.push(map.get(node) as Scope)
        }
      }
    })
    expect(scopes.length).toBe(1)

    const last = scopes.at(-1) as Scope
    expect(last.variables.size).toBe(4)
    expect(last.variables.has('a')).toBe(true)
    expect(last.variables.has('b')).toBe(true)
    expect(last.variables.has('c')).toBe(true)
    expect(last.variables.has('d')).toBe(true)
    expect(last.variables.get('a')?.references.size).toBe(1)
    expect(last.variables.get('b')?.references.size).toBe(2)
    expect(last.variables.get('c')?.references.size).toBe(2)
    expect(last.variables.get('d')?.references.size).toBe(2)
    expect(last.references.length).toBe(9)

    expect(rootScope.children.length).toBe(1)
    expect(rootScope.variables.size).toBe(2)
    expect(rootScope.variables.has('foo')).toBe(true)
    expect(rootScope.variables.has('bar')).toBe(true)
    expect(rootScope.variables.get('foo')?.references.size).toBe(2)
    expect(rootScope.variables.get('bar')?.references.size).toBe(1)
    expect(rootScope.references.length).toBe(2)

    const bar = rootScope.getVariable('bar')
    expect(bar?.definition.kind).toBe('const')
    expect(bar?.definition.node.type).toBe('VariableDeclarator')
  })

  test('ArrowFunctionExpression', () => {
    const program = babelParse(`
      const foo = 1
      const bar = (a, b, c) => {
        const d = foo
        console.log(d, b, c)
      }
    `)
    const { map, scope: rootScope } = analyze(program)

    const scopes = [] as Scope[]
    walkAST(program, {
      enter(node) {
        if (map.has(node)) {
          scopes.push(map.get(node) as Scope)
        }
      }
    })
    expect(scopes.length).toBe(1)

    const last = scopes.at(-1) as Scope
    expect(last.variables.size).toBe(4)
    expect(last.variables.has('a')).toBe(true)
    expect(last.variables.has('b')).toBe(true)
    expect(last.variables.has('c')).toBe(true)
    expect(last.variables.has('d')).toBe(true)
    expect(last.variables.get('a')?.references.size).toBe(1)
    expect(last.variables.get('b')?.references.size).toBe(2)
    expect(last.variables.get('c')?.references.size).toBe(2)
    expect(last.variables.get('d')?.references.size).toBe(2)
    expect(last.references.length).toBe(9)

    expect(rootScope.children.length).toBe(1)
    expect(rootScope.variables.size).toBe(2)
    expect(rootScope.variables.has('foo')).toBe(true)
    expect(rootScope.variables.has('bar')).toBe(true)
    expect(rootScope.variables.get('foo')?.references.size).toBe(2)
    expect(rootScope.variables.get('bar')?.references.size).toBe(1)
    expect(rootScope.references.length).toBe(2)

    const bar = rootScope.getVariable('bar')
    expect(bar?.definition.kind).toBe('const')
    expect(bar?.definition.node.type).toBe('VariableDeclarator')
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
    }`)

    const { map, scope } = analyze(program)
    const scopes = []
    walkAST(program, {
      enter(node) {
        if (map.has(node)) {
          scopes.push(node)
        }
      }
    })

    expect(scopes.length).toBe(14)
    // TODO: should more tweak scopes
    expect(scope.children.length).toBe(9)
  })

  test('definintion kind', () => {
    const program = babelParse(`
    const a = 1
    let b = 2
    var c = 3
    function foo(a) {
      const b = 21
    }
    const bar = function inner(c) {
      let d = 42
    }
    const baz = (g) => {
      const gg = 42
    }
    class Qux {}
    try { const t = 1 } catch (e) { const f = 2 }
    switch (baz) {
      case 1:
        break;
      case 2: {
        break;
      }
    }`)

    const { scope } = analyze(program)

    expect(scope.getVariable('a')?.definition.kind).toBe('const')
    expect(scope.getVariable('b')?.definition.kind).toBe('let')
    expect(scope.getVariable('c')?.definition.kind).toBe('var')
    expect(scope.getVariable('foo')?.definition.kind).toBe('function')
    const funcDefScope = scope.children[0]
    expect(funcDefScope.getVariable('a')?.definition.kind).toBe('function')
    expect(funcDefScope.getVariable('b')?.definition.kind).toBe('const')
    expect(scope.getVariable('bar')?.definition.kind).toBe('const')
    const funcExpScope = scope.children[1]
    expect(funcExpScope.getVariable('c')?.definition.kind).toBe('function')
    expect(funcExpScope.getVariable('d')?.definition.kind).toBe('let')
    const funcArrowScope = scope.children[2]
    expect(funcArrowScope.getVariable('g')?.definition.kind).toBe('function')
    expect(funcArrowScope.getVariable('gg')?.definition.kind).toBe('const')
    expect(scope.getVariable('Qux')?.definition.kind).toBe('class')
    const tryScope = scope.children[3]
    expect(tryScope.getVariable('t')?.definition.kind).toBe('const')
    const catchScope = scope.children[4]
    expect(catchScope.getVariable('e')?.definition.kind).toBe('catch')
    // FIXME: should be const in catch scope block
    // expect(catchScope.getVariable('g')?.definition.kind).toBe('const')
    // FIXME: should scope switch and switch case
    // const swtichBlock = scope.children[5]
    // console.log(swtichBlock)
  })

  test('escope example case', () => {
    // NOTE: https://mazurov.github.io/escope-demo/
    const program = babelParse(`
const calculateAmortization = (principal, years, rate) => {
    let {monthlyRate, monthlyPayment} = calculateMonthlyPayment(principal, years, rate);
    let balance = principal;
    let amortization = [];
    for (let y=0; y<years; y++) {
        let interestY = 0;  //Interest payment for year y
        let principalY = 0; //Principal payment for year y
        for (let m=0; m<12; m++) {
            let interestM = balance * monthlyRate;       //Interest payment for month m
            let principalM = monthlyPayment - interestM; //Principal payment for month m
            interestY = interestY + interestM;
            principalY = principalY + principalM;
            balance = balance - principalM;
        }
        amortization.push({principalY, interestY, balance});
    }
    return {monthlyPayment, monthlyRate, amortization};
}`)
    const { map, scope: top, globals } = analyze(program)
    const scopes: Scope[] = []
    walkAST(program, {
      enter(node) {
        if (map.has(node)) {
          scopes.push(map.get(node) as Scope)
        }
      }
    })

    expect(globals.size).toBe(1)
    expect(globals.has('calculateMonthlyPayment')).toBe(true)

    expect(top.children.length).toBe(1)
    expect(top.variables.size).toBe(1)
    expect(top.variables.has('calculateAmortization')).toBe(true)
    expect(top.variables.get('calculateAmortization')?.references.size).toBe(1)
    expect(top.references.length).toBe(1)

    const last = scopes.at(-1) as Scope
    expect(last.children.length).toBe(0)
    expect(last.variables.size).toBe(2)
    expect(last.variables.has('interestM')).toBe(true)
    expect(last.variables.has('principalM')).toBe(true)
    expect(last.variables.get('interestM')?.references.size).toBe(3)
    expect(last.variables.get('principalM')?.references.size).toBe(3)
    expect(last.references.length).toBe(15)

    const bottomForScope = last.parent as Scope
    expect(bottomForScope.children.length).toBe(1)
    expect(bottomForScope.variables.size).toBe(1)
    expect(bottomForScope.variables.has('m')).toBe(true)
    expect(bottomForScope.variables.get('m')?.references.size).toBe(3)
    expect(bottomForScope.references.length).toBe(3)
    const m = bottomForScope.getVariable('m')
    expect(m?.definition.node.type).toBe('VariableDeclarator')

    const blockScopeOnFor = bottomForScope.parent as Scope
    expect(blockScopeOnFor.children.length).toBe(1)
    expect(blockScopeOnFor.variables.size).toBe(2)
    expect(blockScopeOnFor.variables.has('interestY')).toBe(true)
    expect(blockScopeOnFor.variables.has('principalY')).toBe(true)
    expect(blockScopeOnFor.variables.get('interestY')?.references.size).toBe(4)
    expect(blockScopeOnFor.variables.get('principalY')?.references.size).toBe(4)
    expect(blockScopeOnFor.references.length).toBe(6)

    const topForScope = blockScopeOnFor.parent as Scope
    expect(topForScope.children.length).toBe(1)
    expect(topForScope.variables.size).toBe(1)
    expect(topForScope.variables.has('y')).toBe(true)
    expect(topForScope.variables.get('y')?.references.size).toBe(3)
    expect(topForScope.references.length).toBe(4)
    const y = topForScope.getVariable('y')
    expect(y?.definition.node.type).toBe('VariableDeclarator')

    const functionScope = topForScope.parent as Scope
    expect(functionScope.children.length).toBe(1)
    expect(functionScope.variables.size).toBe(7)
    expect(functionScope.variables.has('principal')).toBe(true)
    expect(functionScope.variables.get('principal')?.references.size).toBe(3)
    expect(functionScope.variables.has('years')).toBe(true)
    expect(functionScope.variables.get('years')?.references.size).toBe(3)
    expect(functionScope.variables.has('rate')).toBe(true)
    expect(functionScope.variables.get('rate')?.references.size).toBe(2)
    expect(functionScope.variables.has('monthlyRate')).toBe(true)
    expect(functionScope.variables.get('monthlyRate')?.references.size).toBe(3)
    expect(functionScope.variables.has('monthlyPayment')).toBe(true)
    expect(functionScope.variables.get('monthlyPayment')?.references.size).toBe(3)
    expect(functionScope.variables.has('balance')).toBe(true)
    expect(functionScope.variables.get('balance')?.references.size).toBe(5)
    expect(functionScope.variables.has('amortization')).toBe(true)
    expect(functionScope.variables.get('amortization')?.references.size).toBe(3)
    expect(functionScope.references.length).toBe(15)

    const root = functionScope.parent as Scope
    expect(root).toBe(top)
    expect(root.children.length).toBe(top.children.length)
  })
})

describe('getReferences', () => {
  const program = babelParse(`
    const a = 1
    const foo = (b) => {
      const c = a
      console.log(c, b)
    }
  `)
  const { scope } = analyze(program)

  test('basic', () => {
    const refs = getReferences(scope.getVariable('a')!)
    expect(refs.length).toBe(1)
    expect(refs[0]).not.toEqual(scope.getVariable('a')?.identifier)
  })

  test('not exclude', () => {
    const refs = getReferences(scope.getVariable('a')!, false)
    expect(refs.length).toBe(2)
  })
})
