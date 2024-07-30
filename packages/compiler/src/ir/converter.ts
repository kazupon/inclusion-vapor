import { NodeTypes, createSimpleExpression } from '@vue-vapor/compiler-dom'
import { generate } from 'astring'
import {
  isSvelteAttribute,
  isSvelteSpreadAttribute,
  isSvelteText,
  isSvelteMustacheTag,
  isSvelteShorthandAttribute
} from './svelte'
import { parseExpression } from '@babel/parser'

import type { AttributeNode, SourceLocation, SimpleExpressionNode } from '@vue-vapor/compiler-dom'
import type { VaporDirectiveNode } from './nodes'
import type { SvelteElement, SvelteAttribute, SvelteText, SvelteSpreadAttribute } from './svelte'

export function convertProps(node: SvelteElement): (VaporDirectiveNode | AttributeNode)[] {
  const props: (VaporDirectiveNode | AttributeNode)[] = []

  const attrsOrProps = node.attributes
  for (const attrOrProp of attrsOrProps) {
    if (isSvelteAttribute(attrOrProp)) {
      if (isVaporDirectable(attrOrProp)) {
        props.push(convertVaporDirective(attrOrProp))
      } else {
        props.push(convertSvelteAttribute(attrOrProp))
      }
    } else if (isSvelteSpreadAttribute(attrOrProp)) {
      props.push(convertVaporDirective(attrOrProp))
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

function convertVaporDirective(node: SvelteAttribute | SvelteSpreadAttribute): VaporDirectiveNode {
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
  } else {
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
  }
}

function convertVaporDirectiveExpression(node: SvelteAttribute): SimpleExpressionNode | undefined {
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
