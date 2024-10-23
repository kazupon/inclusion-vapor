import type { Node } from '@babel/types'

export function isReference(node: Node, parent?: Node): boolean {
  if (node.type === 'MemberExpression') {
    return !node.computed && isReference(node.object, node)
  }

  if (node.type === 'Identifier') {
    if (!parent) {
      return true
    }

    switch (parent.type) {
      // disregard `bar` in `foo.bar`
      case 'MemberExpression': {
        return parent.computed || node === parent.object
      }

      // disregard the `foo` in `class {foo(){}}` but keep it in `class {[foo](){}}`
      case 'ClassMethod': {
        return parent.computed
      }

      // disregard the `foo` in `class {foo=bar}` but keep it in `class {[foo]=bar}` and `class {bar=foo}`
      case 'ClassProperty': {
        return parent.computed || node === parent.value
      }

      // disregard the `bar` in `{ bar: foo }`, but keep it in `{ [bar]: foo }`
      case 'ObjectProperty': {
        return parent.computed || node === parent.value
      }

      // disregard the `bar` in `export { foo as bar }` or
      // the foo in `import { foo as bar }`
      case 'ExportSpecifier':
      case 'ImportSpecifier': {
        return node === parent.local
      }

      // disregard the `foo` in `foo: while (...) { ... break foo; ... continue foo;}`
      case 'LabeledStatement':
      case 'BreakStatement':
      case 'ContinueStatement': {
        return false
      }
      default: {
        return true
      }
    }
  }

  return false
}
