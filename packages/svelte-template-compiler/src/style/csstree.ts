// SPDX-License-Identifier: MIT
// Author: kazuya kawaguchi (a.k.a. kazupon)

import type {
  Atrule,
  AtrulePrelude,
  AttributeSelector,
  Block,
  Brackets,
  ClassSelector,
  Combinator,
  CssNode,
  Declaration,
  DeclarationList,
  FunctionNode,
  Identifier,
  IdSelector,
  MediaFeature,
  MediaQuery,
  MediaQueryList,
  Parentheses,
  PseudoClassSelector,
  PseudoElementSelector,
  Selector,
  SelectorList,
  StyleSheet,
  TypeSelector,
  Value
} from 'css-tree'

export function hasChildren(
  node: CssNode
): node is
  | AtrulePrelude
  | Block
  | Brackets
  | DeclarationList
  | FunctionNode
  | MediaQuery
  | MediaQueryList
  | Parentheses
  | PseudoClassSelector
  | PseudoElementSelector
  | Selector
  | SelectorList
  | StyleSheet
  | Value {
  return 'children' in node
}

export type CssNodeWithChildren =
  | AtrulePrelude
  | Block
  | Brackets
  | DeclarationList
  | FunctionNode
  | MediaQuery
  | MediaQueryList
  | Parentheses
  | PseudoClassSelector
  | PseudoElementSelector
  | Selector
  | SelectorList
  | StyleSheet
  | Value

export function hasName(
  node: CssNode
): node is
  | Atrule
  | AttributeSelector
  | ClassSelector
  | Combinator
  | FunctionNode
  | IdSelector
  | Identifier
  | MediaFeature
  | PseudoClassSelector
  | PseudoElementSelector
  | TypeSelector {
  return 'name' in node
}

export function hasProperty(node: CssNode): node is Declaration {
  return node.type === 'Declaration' && 'property' in node
}
