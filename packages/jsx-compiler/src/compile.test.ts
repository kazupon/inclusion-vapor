import { parse } from '@babel/parser'
import { describe, expect, test } from 'vitest'
import { compile } from './compile.ts'

const jsxCode = `
(<button onClick={increment}>
  count is {count}
</button>)`

describe('compile', () => {
  test('source code', () => {
    const { code, preamble, vaporHelpers } = compile(jsxCode, {
      sourceMap: true,
      parser: (source: string) =>
        parse(source, {
          sourceType: 'module',
          plugins: ['jsx']
        }).program
    })
    expect(code).toMatchSnapshot('code')
    expect(preamble).toMatchSnapshot('preamble')
    expect(vaporHelpers).toMatchSnapshot('vaporHelpers')
    expect(code).contains(`_renderEffect(() => _setText(n0, "\\n  count is ", count, "\\n"))`)
  })

  test('ast', () => {
    const { code, preamble, vaporHelpers } = compile(
      parse(jsxCode, {
        sourceType: 'module',
        plugins: ['jsx']
      }).program,
      {
        sourceMap: true
      }
    )
    expect(code).toMatchSnapshot('code')
    expect(preamble).toMatchSnapshot('preamble')
    expect(vaporHelpers).toMatchSnapshot('vaporHelpers')
    expect(code).contains(`_renderEffect(() => _setText(n0, "\\n  count is ", count, "\\n"))`)
  })
})
