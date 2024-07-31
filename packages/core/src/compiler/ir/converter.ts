import { NodeTypes, createSimpleExpression } from '@vue-vapor/compiler-dom'
import { generate } from 'astring'
import { parseExpression } from '@babel/parser'
import {
  isSvelteAttribute,
  isSvelteSpreadAttribute,
  isSvelteText,
  isSvelteMustacheTag,
  isSvelteShorthandAttribute,
  isSvelteEventHandler
} from './svelte'

import type { AttributeNode, SourceLocation, SimpleExpressionNode } from '@vue-vapor/compiler-dom'
import type { VaporDirectiveNode } from './nodes'
import type {
  SvelteElement,
  SvelteAttribute,
  SvelteText,
  SvelteSpreadAttribute,
  SvelteBaseDirective
} from './svelte'

export function convertProps(node: SvelteElement): (VaporDirectiveNode | AttributeNode)[] {
  const props: (VaporDirectiveNode | AttributeNode)[] = []

  const attrs = node.attributes
  for (const attr of attrs) {
    if (isSvelteAttribute(attr)) {
      if (isVaporDirectable(attr)) {
        props.push(convertVaporDirective(attr))
      } else {
        props.push(convertSvelteAttribute(attr))
      }
    } else if (isSvelteSpreadAttribute(attr) || isSvelteEventHandler(attr)) {
      props.push(convertVaporDirective(attr))
    }
  }

  return props
}

function isVaporDirectable(node: SvelteAttribute | SvelteSpreadAttribute): boolean {
  if (Array.isArray(node.value)) {
    return node.value.length === 1
      ? !isSvelteText(node.value[0])
      : node.value.some(v => isSvelteMustacheTag(v) || isSvelteSpreadAttribute(v))
  } else {
    return false
  }
}

function convertSvelteAttribute(node: SvelteAttribute): AttributeNode {
  let attrOnly = false
  let value: SvelteText
  if (typeof node.value === 'boolean') {
    attrOnly = true
  } else if (Array.isArray(node.value) && node.value.length === 1 && isSvelteText(node.value[0])) {
    value = (node.value as unknown[])[0] as SvelteText
  } else {
    // TODO: we should consider error strategy
    throw new Error('svelte attribute dones not have expteced value')
  }

  const nameLocEnd = attrOnly ? node.end : node.start + node.name.length + 1
  const ret = {
    type: NodeTypes.ATTRIBUTE,
    name: node.name,
    loc: convertSvelteLocation(node, attrOnly ? node.name : `${node.name}="${value!.raw}"`),
    nameLoc: convertSvelteLocation({ start: node.start, end: nameLocEnd }, node.name),
    value: attrOnly
      ? undefined
      : {
          type: NodeTypes.TEXT,
          content: value!.data,
          loc: convertSvelteLocation({ start: nameLocEnd + 1, end: node.end }, `"${value!.raw}"`)
        }
  } as AttributeNode
  return ret
}

const EVENT_MODIFIERS_MAP: Record<string, string> = {
  preventDefault: 'prevent',
  stopPropagation: 'stop',
  capture: 'capture',
  self: 'self',
  once: 'once',
  passive: 'passive'
}

function convertVaporDirective(
  node: SvelteAttribute | SvelteSpreadAttribute | SvelteBaseDirective
): VaporDirectiveNode {
  if (isSvelteAttribute(node)) {
    const start = node.start
    const arg = createSimpleExpression(
      node.name,
      true,
      convertSvelteLocation({ start, end: start + node.name.length }, node.name)
    )
    const exp = convertVaporDirectiveExpression(node)
    if (exp) {
      const ast = parseExpression(` ${exp.content}`, {
        sourceType: 'module'
        // TODO: use babel plugins
        // plugins: context.options.expressionPlugins
      })
      exp.ast = ast
    }
    const directiveLoc = {
      start,
      end: exp ? start + exp.content.length : start
    }
    const directiveLocSource = exp ? `${node.name}="${exp.content}"` : node.name
    return {
      type: NodeTypes.DIRECTIVE,
      name: 'bind',
      rawName: `:${node.name}`,
      modifiers: [],
      loc: convertSvelteLocation(directiveLoc, directiveLocSource),
      arg,
      exp
    }
  } else if (isSvelteSpreadAttribute(node)) {
    const content = generate(node.expression)
    return {
      type: NodeTypes.DIRECTIVE,
      name: 'bind',
      rawName: 'v-bind',
      modifiers: [],
      loc: convertSvelteLocation(node, `v-bind="${content}"`),
      exp: createSimpleExpression(content, false, convertSvelteLocation(node, content)),
      arg: undefined
    }
  } else if (isSvelteEventHandler(node)) {
    const start = node.start
    const arg = createSimpleExpression(
      node.name,
      true,
      convertSvelteLocation({ start, end: start + node.name.length }, node.name)
    )
    const exp = convertVaporDirectiveExpression(node)
    if (exp) {
      const ast = parseExpression(` ${exp.content}`, {
        sourceType: 'module'
        // TODO: use babel plugins
        // plugins: context.options.expressionPlugins
      })
      exp.ast = ast
    }
    const modifiers =
      node.modifiers.length > 0 ? node.modifiers.map(m => EVENT_MODIFIERS_MAP[m]) : []
    const modifiersSource = `${node.modifiers.length > 0 ? '|' : ''}${node.modifiers.join('|')}`
    const directiveLocSource = exp
      ? `on:${node.name}${modifiersSource}="${exp.content}"`
      : node.name
    const directiveLoc = {
      start,
      end: exp ? start + directiveLocSource.length : start
    }
    const vaporModifiers = `${modifiers.length > 0 ? '.' : ''}${modifiers.join('.')}`
    return {
      type: NodeTypes.DIRECTIVE,
      name: 'on',
      rawName: `v-on:${node.name}${vaporModifiers}`,
      modifiers,
      loc: convertSvelteLocation(directiveLoc, directiveLocSource),
      arg,
      exp
    }
  }
}

function convertVaporDirectiveExpression(
  node: SvelteAttribute | SvelteBaseDirective
): SimpleExpressionNode | undefined {
  if (isSvelteAttribute(node) && Array.isArray(node.value)) {
    if (node.value.some(v => isSvelteSpreadAttribute(v) || isSvelteShorthandAttribute(v))) {
      return undefined
    }

    let content = ''
    for (const value of node.value) {
      if (isSvelteMustacheTag(value)) {
        content += generate(value.expression)
      } else if (isSvelteText(value)) {
        content += value.data
      }
    }

    return createSimpleExpression(content, false, convertSvelteLocation(node, content))
  } else if (isSvelteEventHandler(node)) {
    const content =
      node.expression == undefined ? `$emit('${node.name}')` : generate(node.expression)
    return createSimpleExpression(content, false, convertSvelteLocation(node, content))
  } else {
    return undefined
  }
}

export function convertSvelteLocation(
  node: { start: number; end: number },
  source: string
): SourceLocation {
  return {
    start: {
      offset: node.start - 1,
      line: -1,
      column: node.start
    },
    end: {
      offset: node.end - 1,
      line: -1,
      column: node.end
    },
    source
  }
}
