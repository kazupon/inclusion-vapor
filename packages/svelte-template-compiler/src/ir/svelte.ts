// SPDX-License-Identifier: MIT
// Author: kazuya kawaguchi (a.k.a. kazupon)

import { isObject, makeMap } from '@vue-vapor/shared'

import type { SourceLocation } from '@vue-vapor/compiler-dom'
import type {
  Comment as SveletComment,
  Attribute as SvelteAttribute,
  AwaitBlock as SvelteAwaitBlock,
  BaseDirective as SvelteBaseDirective,
  BaseExpressionDirective as SvelteBaseExpressionDirective,
  BaseNode as SvelteBaseNode,
  CatchBlock as SvelteCatchBlock,
  ComponentTag as SvelteComponentTag,
  Directive as SvelteDirective,
  EachBlock as SvelteEachBlock,
  Element as SvelteElement,
  ElseBlock as SvelteElseBlock,
  IfBlock as SvelteIfBlock,
  MustacheTag as SvelteMustacheTag,
  PendingBlock as SveltePendingBlock,
  ShorthandAttribute as SvelteShorthandAttribute,
  SpreadAttribute as SvelteSpreadAttribute,
  StyleDirective as SvelteStyleDirective,
  TemplateNode as SvelteTemplateNode,
  Text as SvelteText,
  ThenBlock as SvelteThenBlock
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

export function isSvelteIfBlock(node: unknown): node is SvelteIfBlock {
  return isObject(node) && 'type' in node && node.type === 'IfBlock'
}

export function isSvelteElseBlock(node: unknown): node is SvelteElseBlock {
  return isObject(node) && 'type' in node && node.type === 'ElseBlock'
}

export function isSvelteEachBlock(node: unknown): node is SvelteEachBlock {
  return isObject(node) && 'type' in node && node.type === 'EachBlock'
}

export function isSvelteAwaitBlock(node: unknown): node is SvelteAwaitBlock {
  return isObject(node) && 'type' in node && node.type === 'AwaitBlock'
}

export function isSveltePendingBlock(node: unknown): node is SveltePendingBlock {
  return isObject(node) && 'type' in node && node.type === 'PendingBlock'
}

export function isSvelteThenBlock(node: unknown): node is SvelteThenBlock {
  return isObject(node) && 'type' in node && node.type === 'ThenBlock'
}

export function isSvelteCatchBlock(node: unknown): node is SvelteCatchBlock {
  return isObject(node) && 'type' in node && node.type === 'CatchBlock'
}

export function isIfBlockOnTop(node: SvelteIfBlock): boolean {
  return node.type === 'IfBlock' && !node.elseif
}

export function isIfBlockOnElseBlock(node: SvelteIfBlock): boolean {
  return node.type === 'IfBlock' && !!node.elseif
}

export function isSvelteSlot(node: unknown): boolean {
  return isObject(node) && 'type' in node && node.type === 'Slot'
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

export function createAttributeChunks(
  attr: SvelteBaseDirective | SvelteAttribute | SvelteSpreadAttribute
): (SvelteMustacheTag | SvelteText)[] {
  const chunks: (SvelteText | SvelteMustacheTag)[] = Array.isArray(attr.value)
    ? attr.value.map(n => {
        if (isSvelteText(n)) {
          return n
        } else if (isSvelteMustacheTag(n)) {
          return n
        } else {
          throw new Error('unexpected node')
        }
      })
    : []
  return chunks
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

export function enableStructures(node: SvelteTemplateNode): void {
  let last: SvelteTemplateNode | undefined
  const children = node.children || []

  if (node.type === 'Fragment') {
    node.parent = null // eslint-disable-line unicorn/no-null
  }

  const parent =
    isSveltePendingBlock(node) || isSvelteThenBlock(node) || isSvelteCatchBlock(node)
      ? node.parent
      : node

  children.forEach(child => {
    // ignores
    if (isSvelteText(child) || isSvelteComponentTag(child)) {
      return
    }

    child.parent = parent

    if (last) {
      last.next = child
    }

    child.prev = last
    last = child

    if (child.children) {
      enableStructures(child)
    }

    if ((isSvelteIfBlock(child) || isSvelteEachBlock(child)) && isSvelteElseBlock(child.else)) {
      child.else.parent = child
      enableStructures(child.else)
    }

    if (isSvelteAwaitBlock(child)) {
      child.pending.parent = child
      enableStructures(child.pending)
      child.then.parent = child
      enableStructures(child.then)
      child.catch.parent = child
      enableStructures(child.catch)
    }
  })
}

export function walk(
  node: SvelteTemplateNode,
  {
    enter,
    leave
  }: { enter?: (node: SvelteTemplateNode) => void; leave?: (node: SvelteTemplateNode) => void }
): void {
  enter?.(node)
  if (node.children) {
    // if (!isSvelteSlot(node) && node.children) {
    for (const child of node.children) {
      walk(child, { enter, leave })
    }
  }
  if ((isSvelteIfBlock(node) || isSvelteEachBlock(node)) && isSvelteElseBlock(node.else)) {
    walk(node.else, { enter, leave })
  }
  if (isSvelteAwaitBlock(node)) {
    walk(node.pending, { enter, leave })
    walk(node.then, { enter, leave })
    walk(node.catch, { enter, leave })
  }
  leave?.(node)
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
  AwaitBlock as SvelteAwaitBlock,
  BaseDirective as SvelteBaseDirective,
  BaseExpressionDirective as SvelteBaseExpressionDirective,
  BaseNode as SvelteBaseNode,
  CatchBlock as SvelteCatchBlock,
  Comment as SvelteComment,
  ComponentTag as SvelteComponentTag,
  Directive as SvelteDirective,
  EachBlock as SvelteEachBlock,
  Element as SvelteElement,
  ElseBlock as SvelteElseBlock,
  IfBlock as SvelteIfBlock,
  MustacheTag as SvelteMustacheTag,
  PendingBlock as SveltePendingBlock,
  Script as SvelteScript,
  ShorthandAttribute as SvelteShorthandAttribute,
  SpreadAttribute as SvelteSpreadAttribute,
  Style as SvelteStyle,
  StyleDirective as SvelteStyleDirective,
  TemplateNode as SvelteTemplateNode,
  Text as SvelteText,
  ThenBlock as SvelteThenBlock
} from 'svelte/types/compiler/interfaces'

export { type SourceLocation } from '@vue-vapor/compiler-dom'
