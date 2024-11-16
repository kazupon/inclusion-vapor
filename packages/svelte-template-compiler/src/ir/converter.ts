import { parseExpression } from '@babel/parser'
import { NodeTypes, createSimpleExpression } from '@vue-vapor/compiler-dom'
import { generate } from 'astring'
import {
  findAttrs,
  isSvelteAttribute,
  isSvelteBindingDirective,
  isSvelteClassDirective,
  isSvelteComponentTag,
  isSvelteEventHandler,
  isSvelteMustacheTag,
  isSvelteShorthandAttribute,
  isSvelteSpreadAttribute,
  isSvelteStyleDirective,
  isSvelteText
} from './svelte.ts'

import type {
  AttributeNode,
  SimpleExpressionNode,
  SourceLocation,
  TextNode
} from '@vue-vapor/compiler-dom'
import type { VaporDirectiveNode } from './nodes'
import type {
  SvelteAttribute,
  SvelteBaseDirective,
  SvelteComponentTag,
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
    } else if (isSvelteSpreadAttribute(attr) || isSvelteEventHandler(attr)) {
      props.push(convertVaporDirective(attr, node)) // TODO: more refactor for if-lese condition
    } else if (isSvelteBindingDirective(attr) && attr.name !== 'this') {
      // ignore `this:bind` converting on `convertProps`
      props.push(convertVaporDirective(attr, node)) // TODO: more refactor for if-lese condition
    } else if (isSvelteClassDirective(attr)) {
      // `class:xxx` converting on `convertProps`
      props.push(convertVaporDirective(attr, node)) // TODO: more refactor for if-lese condition
    } else if (isSvelteStyleDirective(attr)) {
      // `style:xxx` converting on `convertProps`
      props.push(convertVaporDirective(attr, node)) // TODO: more refactor for if-lese condition
    }
  }

  if (isSvelteComponentTag(node)) {
    props.push(convertVaporDirectiveComponentExpression(node))
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

export function convertSvelteAttribute(node: SvelteAttribute): AttributeNode {
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
    // TODO: align loc for svlete compiler
    const directiveLoc = {
      start,
      end: exp ? start + directiveLocSource.length : start
    }
    const vaporModifiers = `${modifiers.length > 0 ? '.' : ''}${modifiers.join('.')}`
    return {
      type: NodeTypes.DIRECTIVE,
      name: 'on',
      rawName: `v-on:${node.name}${vaporModifiers}`,
      // TODO: align loc for svlete compiler
      modifiers: modifiers.map(m =>
        createSimpleExpression(m, true, convertSvelteLocation(node, m))
      ),
      // TODO: align loc for svlete compiler
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
        modifiers = [...modifiers, value.data]
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
    // TODO: align loc for svlete compiler
    const directiveLoc = {
      start,
      end: start + directiveLocSource.length
    }
    return {
      type: NodeTypes.DIRECTIVE,
      name: 'model',
      rawName,
      // TODO: align loc for svlete compiler
      modifiers: modifiers.map(m =>
        createSimpleExpression(m, true, convertSvelteLocation(node, m))
      ),
      loc: convertSvelteLocation(directiveLoc, directiveLocSource),
      exp,
      arg
    }
  } else if (isSvelteClassDirective(node)) {
    const start = node.start
    const arg = createSimpleExpression(
      'class',
      true,
      // TODO: align loc for svlete compiler
      convertSvelteLocation({ start, end: node.end }, 'class')
    )
    const modifiers: SimpleExpressionNode[] = []
    const exp = convertVaporDirectiveExpression(node)
    if (exp) {
      const ast = parseExpression(` ${exp.content}`, {
        sourceType: 'module'
        // TODO: use babel plugins
        // plugins: context.options.expressionPlugins
      })
      exp.ast = ast
    }
    return {
      type: NodeTypes.DIRECTIVE,
      name: 'bind',
      rawName: `:class`,
      modifiers,
      // loc: convertSvelteLocation(directiveLoc, directiveLocSource),
      loc: convertSvelteLocation(node, `:class`),
      arg,
      exp
    }
  } else if (isSvelteStyleDirective(node)) {
    const start = node.start
    const arg = createSimpleExpression(
      'style',
      true,
      // TODO: align loc for svlete compiler
      convertSvelteLocation({ start, end: node.end }, 'style')
    )
    const modifiers: SimpleExpressionNode[] = []
    const exp = convertVaporDirectiveExpression(node)
    if (exp) {
      const ast = parseExpression(` ${exp.content}`, {
        sourceType: 'module'
        // TODO: use babel plugins
        // plugins: context.options.expressionPlugins
      })
      exp.ast = ast
    }
    return {
      type: NodeTypes.DIRECTIVE,
      name: 'bind',
      rawName: `:style`,
      modifiers,
      // loc: convertSvelteLocation(directiveLoc, directiveLocSource),
      loc: convertSvelteLocation(node, `:style`),
      arg,
      exp
    }
  } else {
    // TODO: we should consider error strategy
    throw new Error('unexpected node type')
  }
}

export function convertVaporDirectiveExpression(
  node: SvelteAttribute | SvelteBaseDirective,
  options: { isStatic?: boolean } = {}
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

    const isStatic = !!options.isStatic
    return createSimpleExpression(content, isStatic, convertSvelteLocation(node, content))
  } else if (isSvelteEventHandler(node)) {
    const content =
      node.expression == undefined ? `$emit('${node.name}')` : generate(node.expression)
    return createSimpleExpression(content, false, convertSvelteLocation(node, content))
  } else if (isSvelteBindingDirective(node)) {
    const content = node.expression ? generate(node.expression) : ''
    return createSimpleExpression(content, false, convertSvelteLocation(node, content))
  } else if (isSvelteClassDirective(node)) {
    const content =
      node.expression && node.expression.type === 'Identifier'
        ? `{ ${node.name}: ${node.expression.name} }`
        : ''
    // TODO: align loc for svlete compiler
    return createSimpleExpression(content, false, convertSvelteLocation(node, content))
  } else if (isSvelteStyleDirective(node)) {
    let content = ''
    // TODO: `important` modifier implenentation
    const importantModifier =
      node.modifiers && node.modifiers.includes('important') ? ' !important' : ''
    if (Array.isArray(node.value) && node.value.length === 1) {
      if (isSvelteText(node.value[0])) {
        content = `{ ${node.name}: '${node.value[0].data}${importantModifier}' }`
      } else if (isSvelteMustacheTag(node.value[0])) {
        const expression = node.value[0].expression
        content =
          expression && expression.type === 'Identifier'
            ? `{ ${node.name}: ${expression.name} }`
            : ''
      }
    } else if (typeof node.value === 'boolean') {
      // shorthand `style:xxx
      content = `{ ${node.name}: ${node.name} }`
    }
    // TODO: align loc for svlete compiler
    return createSimpleExpression(content, false, convertSvelteLocation(node, content))
  } else {
    return undefined
  }
}

export function convertVaporDirectiveComponentExpression(
  node: SvelteComponentTag
): VaporDirectiveNode {
  const content = generate(node.expression)
  return {
    type: NodeTypes.DIRECTIVE,
    name: 'bind',
    rawName: ':this',
    modifiers: [],
    // TODO: align loc for svlete compiler
    loc: convertSvelteLocation(node, `this="${content}"`),
    exp: createSimpleExpression(content, false, convertSvelteLocation(node, content)),
    arg: undefined
  }
}

export function convertVaporAttribute(node: SvelteBaseDirective): AttributeNode {
  if (isSvelteBindingDirective(node) && node.name === 'this') {
    if (__DEV__ && !node.expression) {
      throw new Error('no expression in binding node')
    }

    const content = generate(node.expression!)
    const value: TextNode = {
      type: NodeTypes.TEXT,
      content,
      // TODO: align loc for svlete compiler
      loc: convertSvelteLocation(
        node.expression as unknown as { start: number; end: number },
        content
      )
    }

    return {
      type: NodeTypes.ATTRIBUTE,
      name: 'ref',
      value,
      // TODO: align loc for svlete compiler
      loc: convertSvelteLocation(node as { start: number; end: number }, `bind:this={${content}}`),
      // TODO: align loc for svlete compiler
      nameLoc: convertSvelteLocation(node, `bind:this`)
    }
  }

  throw new Error('unexpected node type')
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
