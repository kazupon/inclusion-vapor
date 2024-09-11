// SPDX-License-Identifier: MIT
// Author: kazuya kawaguchi (a.k.a. kazupon)

import { isObject, makeMap } from '@vue-vapor/shared'

import type { SourceLocation } from '@vue-vapor/compiler-dom'
import type {
  Comment as SveletComment,
  Attribute as SvelteAttribute,
  BaseExpressionDirective as SvelteBaseExpressionDirective,
  BaseNode as SvelteBaseNode,
  Directive as SvelteDirective,
  Element as SvelteElement,
  IfBlock as SvelteIfBlock,
  MustacheTag as SvelteMustacheTag,
  ShorthandAttribute as SvelteShorthandAttribute,
  SpreadAttribute as SvelteSpreadAttribute,
  Text as SvelteText
} from 'svelte/types/compiler/interfaces'

export const isBuiltInDirective: ReturnType<typeof makeMap> = /*#__PURE__*/ makeMap(
  // TODO: add svelte built-in directives
  ''
  //'bind,cloak,else-if,else,for,html,if,model,on,once,pre,show,slot,text,memo',
)

const SVELTE_ELEMENT_TYPES = new Set([
  'InlineComponent',
  'SlotTemplate',
  'Title',
  'Slot',
  'Element',
  'Head',
  'Options',
  'Window',
  'Document',
  'Body'
])

export function isSvelteElement(node: unknown): node is SvelteElement {
  return isObject(node) && 'type' in node && SVELTE_ELEMENT_TYPES.has((node as SvelteBaseNode).type)
}

const SVELTE_DIRECTIVE_TYPES = new Set([
  'Action',
  'Animation',
  'Binding',
  'Class',
  'StyleDirective',
  'EventHandler',
  'Let',
  'Ref',
  'Transition'
])

export function isSvelteDirective(node: unknown): node is SvelteDirective {
  return (
    isObject(node) && 'type' in node && SVELTE_DIRECTIVE_TYPES.has((node as SvelteBaseNode).type)
  )
}

const SVELETE_MUSTACHE_TAG_TYPES = new Set(['MustacheTag', 'RawMustacheTag'])

export function isSvelteMustacheTag(node: unknown): node is SvelteMustacheTag {
  return (
    isObject(node) &&
    'type' in node &&
    SVELETE_MUSTACHE_TAG_TYPES.has((node as SvelteBaseNode).type)
  )
}

export function isSvelteText(node: unknown): node is SvelteText {
  return isObject(node) && 'type' in node && node.type === 'Text'
}

export function isSvelteComment(node: unknown): node is SveletComment {
  return isObject(node) && 'type' in node && node.type === 'Comment'
}

export function isSvelteAttribute(node: unknown): node is SvelteAttribute {
  return isObject(node) && 'type' in node && node.type === 'Attribute'
}

export function isSvelteSpreadAttribute(node: unknown): node is SvelteSpreadAttribute {
  return isObject(node) && 'type' in node && node.type === 'Spread'
}

export function isSvelteShorthandAttribute(node: unknown): node is SvelteShorthandAttribute {
  return isObject(node) && 'type' in node && node.type === 'AttributeShorthand'
}

export function isSvelteEventHandler(node: unknown): node is SvelteBaseExpressionDirective {
  return isObject(node) && 'type' in node && node.type === 'EventHandler'
}

export function isIfBlockOnTop(node: SvelteIfBlock): boolean {
  return node.type === 'IfBlock' && !node.elseif
}

export function isIfBlockOnElseBlock(node: SvelteIfBlock): boolean {
  return node.type === 'IfBlock' && !!node.elseif
}

export function convertToSourceLocation(node: SvelteBaseNode, source: string): SourceLocation {
  return {
    start: {
      offset: node.start,
      line: -1,
      column: -1
    },
    end: {
      offset: node.end,
      line: -1,
      column: -1
    },
    source
  }
}

export type {
  Ast as SvelteAst,
  Attribute as SvelteAttribute,
  BaseDirective as SvelteBaseDirective,
  BaseExpressionDirective as SvelteBaseExpressionDirective,
  BaseNode as SvelteBaseNode,
  Comment as SvelteComment,
  Directive as SvelteDirective,
  Element as SvelteElement,
  ElseBlock as SvelteElseBlock,
  IfBlock as SvelteIfBlock,
  MustacheTag as SvelteMustacheTag,
  Script as SvelteScript,
  ShorthandAttribute as SvelteShorthandAttribute,
  SpreadAttribute as SvelteSpreadAttribute,
  Style as SvelteStyle,
  TemplateNode as SvelteTemplateNode,
  Text as SvelteText
} from 'svelte/types/compiler/interfaces'
