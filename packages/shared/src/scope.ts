import { walkAST } from 'ast-kit'

import type { Node } from '@babel/types'

export function attachScope(ast: Node): void {
  walkAST(ast, {
    enter(_node, _parent, _key, _index) {
      // TODO:
    },
    leave(_node, _parent, _key, _index) {
      // TODO:
    }
  })
}
