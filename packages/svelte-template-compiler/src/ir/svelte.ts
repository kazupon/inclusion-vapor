// SPDX-License-Identifier: MIT
// Author: kazuya kawaguchi (a.k.a. kazupon)

import { isObject, makeMap } from '@vue-vapor/shared'

import type { SourceLocation } from '@vue-vapor/compiler-dom'
import type {
  Comment as SveletComment,
  Attribute as SvelteAttribute,
  BaseExpressionDirective as SvelteBaseExpressionDirective,
  BaseNode as SvelteBaseNode,
  ComponentTag as SvelteComponentTag,
  Directive as SvelteDirective,
  Element as SvelteElement,
  ElseBlock as SvelteElseBlock,
  IfBlock as SvelteIfBlock,
  MustacheTag as SvelteMustacheTag,
  ShorthandAttribute as SvelteShorthandAttribute,
  SpreadAttribute as SvelteSpreadAttribute,
  StyleDirective as SvelteStyleDirective,
  Text as SvelteText
} from 'svelte/types/compiler/interfaces'
import type { SvelteTemplateNode } from './svelte'

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

export function isSvelteMustacheTag(node: unknown): node is SvelteMustacheTag {
  return isObject(node) && 'type' in node && node.type === 'MustacheTag'
}

export function isSvelteText(node: unknown): node is SvelteText {
  return isObject(node) && 'type' in node && node.type === 'Text'
}

export function isSvelteComponentTag(node: unknown): node is SvelteComponentTag {
  return (
    isObject(node) &&
    'type' in node &&
    node.type === 'InlineComponent' &&
    'name' in node &&
    node.name === 'svelte:component'
  )
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

export function isSvelteElseBlock(node: unknown): node is SvelteElseBlock {
  return isObject(node) && 'type' in node && node.type === 'ElseBlock'
}

export function isIfBlockOnTop(node: SvelteIfBlock): boolean {
  return node.type === 'IfBlock' && !node.elseif
}

export function isIfBlockOnElseBlock(node: SvelteIfBlock): boolean {
  return node.type === 'IfBlock' && !!node.elseif
}

export function isSvelteBindingDirective(node: unknown): node is SvelteBaseExpressionDirective {
  return isObject(node) && 'type' in node && node.type === 'Binding'
}

export function isSvelteClassDirective(node: unknown): node is SvelteBaseExpressionDirective {
  return isObject(node) && 'type' in node && node.type === 'Class'
}

export function isSvelteStyleDirective(node: unknown): node is SvelteStyleDirective {
  return isObject(node) && 'type' in node && node.type === 'StyleDirective'
}

// TODO: more refactor the above `isSvelteBindingDirective`
export function isSvelteLetDirective(node: unknown): node is SvelteBaseExpressionDirective {
  return isObject(node) && 'type' in node && node.type === 'Let'
}

export function findAttrs(node: SvelteTemplateNode, name: string): SvelteAttribute | undefined {
  const attrs = node.attributes || [] // eslint-disable-line @typescript-eslint/no-unsafe-assignment
  for (const attr of attrs) {
    if (isSvelteAttribute(attr) && attr.name === name) {
      return attr
    }
  }
  return
}

export interface SvelteCompileError {
  code: string
  start: {
    line: number
    column: number
    character: number
  }
  end: {
    line: number
    column: number
    character: number
  }
  pos: number
  filename: string
  frame: string
}

export function isSvelteParseError(error: unknown): error is SvelteCompileError {
  return (
    isObject(error) &&
    error.constructor.name === 'CompileError' &&
    'code' in error &&
    'start' in error &&
    'end' in error &&
    'pos' in error &&
    'frame' in error
  )
}

export type CompatLocationable = {
  start: number | { line: number; column: number; offset?: number }
  end: number | { line: number; column: number; offset?: number }
  source?: string
}

// TODO: We need to extend svelte AST for location
export function convertToSourceLocation(node: CompatLocationable, source: string): SourceLocation {
  const loc = {
    start: {
      offset: -1,
      line: -1,
      column: -1
    },
    end: {
      offset: -1,
      line: -1,
      column: -1
    },
    source
  }

  function normalize(node: CompatLocationable, position: 'start' | 'end'): void {
    if (isObject(node[position])) {
      loc[position].line = node[position].line
      loc[position].column = node[position].column
      if (node[position].offset) {
        loc[position].offset = node[position].offset
      }
    } else {
      loc[position].offset = node[position]
    }
  }

  normalize(node, 'start')
  normalize(node, 'end')

  if (node.source) {
    loc.source = node.source
  }

  return loc
}

export type {
  Ast as SvelteAst,
  Attribute as SvelteAttribute,
  BaseDirective as SvelteBaseDirective,
  BaseExpressionDirective as SvelteBaseExpressionDirective,
  BaseNode as SvelteBaseNode,
  Comment as SvelteComment,
  ComponentTag as SvelteComponentTag,
  Directive as SvelteDirective,
  EachBlock as SvelteEachBlock,
  Element as SvelteElement,
  ElseBlock as SvelteElseBlock,
  IfBlock as SvelteIfBlock,
  MustacheTag as SvelteMustacheTag,
  Script as SvelteScript,
  ShorthandAttribute as SvelteShorthandAttribute,
  SpreadAttribute as SvelteSpreadAttribute,
  Style as SvelteStyle,
  StyleDirective as SvelteStyleDirective,
  TemplateNode as SvelteTemplateNode,
  Text as SvelteText
} from 'svelte/types/compiler/interfaces'

export { type SourceLocation } from '@vue-vapor/compiler-dom'
