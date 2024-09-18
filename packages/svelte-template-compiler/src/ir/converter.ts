import { parseExpression } from '@babel/parser'
import { NodeTypes, createSimpleExpression } from '@vue-vapor/compiler-dom'
import { generate } from 'astring'
import {
  findAttrs,
  isSvelteAttribute,
  isSvelteBindingDirective,
  isSvelteEventHandler,
  isSvelteMustacheTag,
  isSvelteShorthandAttribute,
  isSvelteSpreadAttribute,
  isSvelteText
} from './svelte.ts'

import type { AttributeNode, SimpleExpressionNode, SourceLocation } from '@vue-vapor/compiler-dom'
import type { VaporDirectiveNode } from './nodes'
import type {
  SvelteAttribute,
  SvelteBaseDirective,
  SvelteElement,
  SvelteSpreadAttribute,
  SvelteText
} from './svelte'

export function convertProps(node: SvelteElement): (VaporDirectiveNode | AttributeNode)[] {
  const props: (VaporDirectiveNode | AttributeNode)[] = []

  const attrs = node.attributes
  for (const attr of attrs) {
    if (isSvelteAttribute(attr)) {
      if (isVaporDirectable(attr)) {
        props.push(convertVaporDirective(attr, node))
      } else {
        props.push(convertSvelteAttribute(attr))
      }
    } else if (
      isSvelteSpreadAttribute(attr) ||
      isSvelteEventHandler(attr) ||
      isSvelteBindingDirective(attr)
    ) {
      props.push(convertVaporDirective(attr, node))
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
  return {
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
  }
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
  node: SvelteAttribute | SvelteSpreadAttribute | SvelteBaseDirective,
  element: SvelteElement
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
      // @ts-expect-error -- FIXME
      modifiers,
      loc: convertSvelteLocation(directiveLoc, directiveLocSource),
      arg,
      exp
    }
  } else if (isSvelteBindingDirective(node)) {
    const start = node.start
    // prettier-ignore
    const arg = element.type === 'InlineComponent' && node.name !== 'value'
      ? createSimpleExpression(
        node.name,
        true,
        convertSvelteLocation({ start, end: start + node.name.length }, node.name)
      )
      : undefined
    const exp = convertVaporDirectiveExpression(node)
    if (exp) {
      const ast = parseExpression(` ${exp.content}`, {
        sourceType: 'module'
        // TODO: use babel plugins
        // plugins: context.options.expressionPlugins
      })
      exp.ast = ast
    }
    const content = exp ? exp.content : ''
    const typeAttr = findAttrs(element, 'type')
    let modifiers = node.modifiers
    let value: { type: string; data: string; raw: string } | undefined
    if (typeAttr) {
      value = (typeAttr.value as { type: string; data: string; raw: string }[]).find(
        v => v.type === 'Text'
      )
      if (value && (value.data === 'number' || value.data === 'range')) {
        modifiers = [...modifiers, 'number']
      }
    }

    // TODO: should be occurred with `onError` option (might not be occurred, so svelte compiler say errors)
    // validate binding
    if (element.name === 'input') {
      if (
        value?.data === 'checkbox' &&
        !(node.name === 'value' || node.name === 'checked' || node.name === 'group')
      ) {
        throw new Error(
          `'<input type="checkbox">' should use 'bind:value' or 'bind:group', not 'bind:${node.name}'`
        )
      }
      if (value?.data === 'radio' && node.name !== 'group') {
        throw new Error(`'<input type="radio">' should use 'bind:group', not 'bind:${node.name}'`)
      }
      if (value?.data === 'file' && node.name !== 'files') {
        throw new Error(`'<input type="file">' should use 'bind:files', not 'bind:${node.name}'`)
      }
    } else if (
      (element.name === 'textarea' || element.name === 'select') &&
      node.name !== 'value'
    ) {
      throw new Error(
        `'<select>' and '<textarea>' should use 'bind:value', not 'bind:${node.name}'`
      )
    }

    const vaporModifiers = `${modifiers.length > 0 ? '.' : ''}${modifiers.join('.')}`
    const rawName = `v-model:${node.name}${modifiers.length > 0 ? vaporModifiers : ''}`
    const directiveLocSource = node.name == content ? rawName : `${rawName}="${content}"`
    const directiveLoc = {
      start,
      end: start + directiveLocSource.length
    }
    return {
      type: NodeTypes.DIRECTIVE,
      name: 'model',
      rawName,
      // @ts-expect-error -- FIXME
      modifiers,
      loc: convertSvelteLocation(directiveLoc, directiveLocSource),
      exp,
      arg
    }
  } else {
    // TODO: we should consider error strategy
    throw new Error('unexpected node type')
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
  } else if (isSvelteBindingDirective(node)) {
    const content = node.expression ? generate(node.expression) : ''
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
