import { babelParse, walkAST } from 'ast-kit'
import { describe, expect, test } from 'vitest'
import { analyze } from './scope.ts'

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
    expect(scope.block).toBe(program)
    expect(scope.variables.size).toBe(1)
    expect(scope.variables.has('a')).toBe(true)
    expect(scope.references.length).toBe(2)
    expect(scope.references.map(node => node.name).sort()).toEqual(['a', 'b'].sort())

    const a = scope.getVariable('a')
    expect(pojo(a?.node)).toMatchObject({
      type: 'Identifier',
      name: 'a'
    })
    expect(a?.references.size).toBe(1)
  })

  test.todo('ImportDefaultSpecifier, ImportSpecifier', () => {})

  test.todo('ExportDefaultDeclaration', () => {})

  test.todo('ExportNamedDeclaration', () => {})

  test.todo('ExportSpecifier', () => {})

  test.todo('FunctionDeclaration', () => {})

  test.todo('FunctionExpression', () => {})

  test.todo('ArrowFunctionExpression', () => {})

  test('extracts all references', () => {
    const program = babelParse(`
    function foo() {
      const bar = 1
      baz()
    }
    `)
    const { map, scope: _rootScope } = analyze(program)

    const scopes = [] as Scope[]
    walkAST(program, {
      enter(node) {
        if (map.has(node)) {
          scopes.push(map.get(node) as Scope)
        }
      }
    })
    const scope = scopes.at(-1) as Scope
    expect(scope.references.map(node => node.name).sort()).toEqual(['bar', 'baz'].sort())
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

    const { map, scope: _scope } = analyze(program)

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

  test('escope example', () => {
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

    expect(top.variables.size).toBe(1)
    expect(top.variables.has('calculateAmortization')).toBe(true)
    expect(top.variables.get('calculateAmortization')?.references.size).toBe(1)
    expect(top.references.length).toBe(1)

    const last = scopes.at(-1) as Scope
    expect(last.variables.size).toBe(2)
    expect(last.variables.has('interestM')).toBe(true)
    expect(last.variables.has('principalM')).toBe(true)
    expect(last.variables.get('interestM')?.references.size).toBe(3)
    expect(last.variables.get('principalM')?.references.size).toBe(3)
    expect(last.references.length).toBe(15)

    const bottomForScope = last.parent as Scope
    expect(bottomForScope.variables.size).toBe(1)
    expect(bottomForScope.variables.has('m')).toBe(true)
    expect(bottomForScope.variables.get('m')?.references.size).toBe(3)
    expect(bottomForScope.references.length).toBe(3)

    const blockScopeOnFor = bottomForScope.parent as Scope
    expect(blockScopeOnFor.variables.size).toBe(2)
    expect(blockScopeOnFor.variables.has('interestY')).toBe(true)
    expect(blockScopeOnFor.variables.has('principalY')).toBe(true)
    expect(blockScopeOnFor.variables.get('interestY')?.references.size).toBe(4)
    expect(blockScopeOnFor.variables.get('principalY')?.references.size).toBe(4)
    expect(blockScopeOnFor.references.length).toBe(6)

    const topForScope = blockScopeOnFor.parent as Scope
    expect(topForScope.variables.size).toBe(1)
    expect(topForScope.variables.has('y')).toBe(true)
    expect(topForScope.variables.get('y')?.references.size).toBe(3)
    expect(topForScope.references.length).toBe(4)

    // TODO: fix this
    // const functionScope = topForScope.parent as Scope
    // const p = functionScope.parent as Scope
    // console.log(functionScope.variables)
    // console.log(p.variables)
    // expect(functionScope.variables.size).toBe(7)
    // expect(functionScope.variables.has('y')).toBe(true)
    // expect(functionScope.variables.get('y')?.references.size).toBe(3)
    // expect(functionScope.references.length).toBe(4)
  })
})
