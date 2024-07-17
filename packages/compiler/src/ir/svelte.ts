// SPDX-License-Identifier: MIT
// Author: kazuya kawaguchi (a.k.a. kazupon)

import { makeMap, isObject } from '@vue-vapor/shared'

import type { SourceLocation } from '@vue-vapor/compiler-dom'
import type {
  Element as SvelteElement,
  BaseNode as SvelteBaseNode,
  Comment as SveletComment,
  Text as SvelteText,
  MustacheTag as SvelteMustacheTag
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
  Element as SvelteElement,
  TemplateNode as SvelteTemplateNode,
  Text as SvelteText,
  MustacheTag as SvelteMustacheTag,
  Comment as SvelteComment,
  Attribute as SvelteAttribute,
  SpreadAttribute as SvelteSpreadAttribute,
  BaseDirective as SvelteBaseDirective,
  BaseNode as SvelteBaseNode
} from 'svelte/types/compiler/interfaces'
