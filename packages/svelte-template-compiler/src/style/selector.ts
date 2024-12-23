// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `svelte`
// Author: Rich-Harris (https://github.com/Rich-Harris) and Svelte team and community
// Repository url: https://github.com/sveltejs/svelte/tree/svelte-4
// Code url: https://github.com/sveltejs/svelte/blob/svelte-4/packages/svelte/src/compiler/compile/css/Selector.js

import {
  createAttributeChunks,
  isSvelteBindingDirective,
  isSvelteClassDirective,
  isSvelteSpreadAttribute,
  isSvelteText
} from '../ir/svelte.ts'
import { hasChildren, hasName } from './csstree.ts'

import type { AttributeSelector as CssAttributeSelector, CssNode } from 'css-tree'
import type { SvelteElement, SvelteMustacheTag } from '../ir/index.ts'

const UNKNOWN = {}
const RE_STARTS_WITH_WHITESPACE = /^\s/
const RE_ENDS_WITH_WHITESPACE = /\s$/

export class Selector {
  node: CssNode
  blocks: Block[]
  localBlocks: Block[]
  used: boolean

  constructor(node: CssNode) {
    this.node = node
    this.blocks = groupSelectors(node)
    // take trailing :global(...) selectors out of consideration
    let i = this.blocks.length
    while (i > 0) {
      if (!this.blocks[i - 1].global) {
        break
      }
      i -= 1
    }
    this.localBlocks = this.blocks.slice(0, i)
    const hostOnly = this.blocks.length === 1 && this.blocks[0].host
    const rootOnly = this.blocks.length === 1 && this.blocks[0].root
    this.used = this.localBlocks.length === 0 || hostOnly || rootOnly
  }
}

export class Block {
  host: boolean
  root: boolean
  combinator: CssNode | null
  selectors: CssNode[]
  start: number | null
  end: number | null
  shouldEncapsulate: boolean

  constructor(combinator: CssNode | null) {
    this.combinator = combinator
    this.host = false
    this.root = false
    this.selectors = []
    this.start = null // eslint-disable-line unicorn/no-null
    this.end = null // eslint-disable-line unicorn/no-null
    this.shouldEncapsulate = false
  }

  add(selector: CssNode): void {
    if (this.selectors.length === 0) {
      this.start = selector.start! // TODO:
      this.host = selector.type === 'PseudoClassSelector' && selector.name === 'host'
    }
    this.root = this.root || (selector.type === 'PseudoClassSelector' && selector.name === 'root')
    this.selectors.push(selector)
    this.end = selector.end! // TODO:
  }

  get global(): boolean {
    // prettier-ignore
    // eslint-disable-next-line unicorn/explicit-length-check
    return (this.selectors.length >= 1 &&
      this.selectors[0].type === 'PseudoClassSelector' &&
      this.selectors[0].name === 'global' &&
      this.selectors.every(
        (selector) => selector.type === 'PseudoClassSelector' || selector.type === 'PseudoElementSelector')
    )
  }
}

function groupSelectors(selector: CssNode): Block[] {
  let block = new Block(null) // eslint-disable-line unicorn/no-null
  const blocks: Block[] = [block]

  if (hasChildren(selector)) {
    selector.children?.forEach(child => {
      if (child.type === 'WhiteSpace' || child.type === 'Combinator') {
        block = new Block(child)
        blocks.push(block)
      } else {
        block.add(child)
      }
    })
  }

  return blocks
}

export function applySelector(
  blocks: Block[],
  node: SvelteElement | null,
  toEncapsulate: { node: SvelteElement; block: Block }[]
): boolean {
  const block = blocks.pop()

  if (!block) {
    return false
  }

  if (!node) {
    return (
      (block.global && blocks.every(block => block.global)) || (block.host && blocks.length === 0)
    )
  }

  switch (blockMightApplyToNode(block, node)) {
    case BlockAppliesToNode.NotPossible: {
      return false
    }
    case BlockAppliesToNode.UnknownSelectorType: {
      toEncapsulate.push({ node, block })
      return true
    }
  }

  if (block.combinator) {
    if (block.combinator.type === 'Combinator' && block.combinator.name === ' ') {
      // TODO:
    } else if (block.combinator.type === 'Combinator' && block.combinator.name === '>') {
      // TODO:
    } else if (
      block.combinator.type === 'Combinator' &&
      (block.combinator.name === '+' || block.combinator.name === '~')
    ) {
      // TODO:
    }

    // TODO: other combinators
    toEncapsulate.push({ node, block })
    return true
  }

  toEncapsulate.push({ node, block })
  return true
}

export enum BlockAppliesToNode {
  NotPossible = 0,
  Possible = 1,
  UnknownSelectorType = 2
}

const RE_BACK_SLASH_AND_FOLLOWING_CHARACTER = /\\(.)/g
const WHITELIST_ATTRIBUTE_SELECTOR = new Map([
  ['details', new Set(['open'])],
  ['dialog', new Set(['open'])]
])

function blockMightApplyToNode(block: Block, node: SvelteElement): BlockAppliesToNode {
  let i = block.selectors.length
  while (i--) {
    const selector = block.selectors[i]

    const name =
      hasName(selector) &&
      typeof selector.name === 'string' &&
      selector.name.replace(RE_BACK_SLASH_AND_FOLLOWING_CHARACTER, '$1') // eslint-disable-line unicorn/prefer-string-replace-all

    if (selector.type === 'PseudoClassSelector' && (name === 'host' || name === 'root')) {
      return BlockAppliesToNode.NotPossible
    }

    if (
      block.selectors.length === 1 &&
      selector.type === 'PseudoClassSelector' &&
      name === 'global'
    ) {
      return BlockAppliesToNode.NotPossible
    }

    if (selector.type === 'PseudoClassSelector' || selector.type === 'PseudoElementSelector') {
      continue
    }

    switch (selector.type) {
      case 'ClassSelector': {
        const classes = node.attributes.filter(attr => isSvelteClassDirective(attr))
        // !node.classes.some((c) => c.name === name)
        if (
          !attributeMatches(node, 'class', name as string, '~=', false) &&
          !classes.some(c => c.name === name)
        ) {
          return BlockAppliesToNode.NotPossible
        }
        break
      }
      case 'IdSelector': {
        if (!attributeMatches(node, 'id', name as string, '=', false)) {
          return BlockAppliesToNode.NotPossible
        }
        break
      }
      case 'AttributeSelector': {
        if (
          !(
            WHITELIST_ATTRIBUTE_SELECTOR.has(node.name.toLowerCase()) &&
            WHITELIST_ATTRIBUTE_SELECTOR.get(node.name.toLowerCase())?.has(
              selector.name.name.toLowerCase()
            )
          ) &&
          selector.value &&
          !attributeMatches(
            node,
            selector.name.name,
            unquote(selector.value),
            // selector.value && unquote(selector.value),
            selector.matcher!, // FIXME:
            selector.flags as unknown as boolean // FIXME:
          )
        ) {
          return BlockAppliesToNode.NotPossible
        }
        break
      }
      case 'TypeSelector': {
        if (
          node.name.toLowerCase() !== (name as string).toLowerCase() &&
          name !== '*' &&
          !isDynamicElement(node)
          // !node.is_dynamic_element
        ) {
          return BlockAppliesToNode.NotPossible
        }
        break
      }
      default: {
        return BlockAppliesToNode.UnknownSelectorType
      }
    }
  }

  return BlockAppliesToNode.Possible
}

function attributeMatches(
  node: SvelteElement,
  name: string,
  expectedValue: string,
  operator: string,
  caseInsensitive: boolean
): boolean {
  // const spread = node.attributes.find((attr) => attr.type === 'Spread');
  const spread = node.attributes.find(attr => isSvelteSpreadAttribute(attr))
  if (spread) {
    return true
  }

  // 	if (node.bindings.some((binding) => binding.name === name)) return true;
  const bindings = node.attributes.filter(attr => isSvelteBindingDirective(attr))
  if (bindings.some(binding => binding.name === name)) {
    return true
  }

  // type: 'Attribute'
  const attr = node.attributes.find(attr => attr.name === name)
  if (!attr) {
    return false
  }

  // if (attr.is_true) return operator === null;
  if (attr.value === true) {
    return operator === null
  }

  // if (attr.chunks.length === 1) {
  //   const value = attr.chunks[0];
  //   if (!value) return false;
  //   if (value.type === 'Text')
  //     return test_attribute(operator, expected_value, case_insensitive, value.data);
  // }
  const chunks = createAttributeChunks(attr)
  if (chunks.length === 1) {
    const value = chunks[0]
    if (!value) {
      return false
    }
    if (isSvelteText(value)) {
      return testAttribute(operator, expectedValue, caseInsensitive, value.data)
    }
  }

  const possibleValues = new Set()
  let prevValues: string[] = []
  for (const chunk of chunks) {
    const currentPossibleValues = new Set()
    // if (chunk.type === 'Text') {
    //   current_possible_values.add(chunk.data);
    // } else {
    //   gather_possible_values(chunk.node, current_possible_values);
    // }
    if (isSvelteText(chunk)) {
      currentPossibleValues.add(chunk.data)
    } else {
      gatherPossibleValues(chunk.expression, currentPossibleValues)
    }

    // impossible to find out all combinations
    if (currentPossibleValues.has(UNKNOWN)) {
      return true
    }

    if (prevValues.length > 0) {
      const startWithSpace: string[] = []
      const remaining: string[] = []
      currentPossibleValues.forEach(currentPossibleValue => {
        if (RE_STARTS_WITH_WHITESPACE.test(currentPossibleValue as string)) {
          startWithSpace.push(currentPossibleValue as string)
        } else {
          remaining.push(currentPossibleValue as string)
        }
      })

      if (remaining.length > 0) {
        if (startWithSpace.length > 0) {
          prevValues.forEach(prevValue => possibleValues.add(prevValue))
        }

        const combined: string[] = []
        prevValues.forEach(prevValue => {
          remaining.forEach(value => {
            combined.push(prevValue + value)
          })
        })
        prevValues = combined

        startWithSpace.forEach(value => {
          if (RE_ENDS_WITH_WHITESPACE.test(value)) {
            possibleValues.add(value)
          } else {
            prevValues.push(value)
          }
        })

        continue
      } else {
        prevValues.forEach(prevValue => possibleValues.add(prevValue))
        prevValues = []
      }
    }

    currentPossibleValues.forEach(currentPossibleValue => {
      if (RE_ENDS_WITH_WHITESPACE.test(currentPossibleValue as string)) {
        possibleValues.add(currentPossibleValue)
      } else {
        prevValues.push(currentPossibleValue as string)
      }
    })

    if (prevValues.length < currentPossibleValues.size) {
      prevValues.push(' ')
    }

    if (prevValues.length > 20) {
      // might grow exponentially, bail out
      return true
    }
  }

  prevValues.forEach(prevValue => possibleValues.add(prevValue))
  if (possibleValues.has(UNKNOWN)) {
    return true
  }

  for (const value of possibleValues) {
    if (testAttribute(operator, expectedValue, caseInsensitive, value as string)) {
      return true
    }
  }

  return false
}

function testAttribute(
  operator: string,
  expectedValue: string,
  caseInsensitive: boolean,
  value: string
): boolean {
  let targetValue = value
  if (caseInsensitive) {
    expectedValue = expectedValue.toLowerCase()
    targetValue = value.toLowerCase()
  }

  switch (operator) {
    case '=': {
      return targetValue === expectedValue
    }
    case '~=': {
      return targetValue.split(/\s/).includes(expectedValue)
    }
    case '|=': {
      return `${targetValue}-`.startsWith(`${expectedValue}-`)
    }
    case '^=': {
      return targetValue.startsWith(expectedValue)
    }
    case '$=': {
      return targetValue.endsWith(expectedValue)
    }
    case '*=': {
      return targetValue.includes(expectedValue)
    }
    default: {
      throw new Error(`this shouldn't happen`)
    }
  }
}

function gatherPossibleValues(node: SvelteMustacheTag['expression'], set: Set<unknown>): void {
  if (node.type === 'Literal') {
    set.add(node.value)
  } else if (node.type === 'ConditionalExpression') {
    gatherPossibleValues(node.consequent, set)
    gatherPossibleValues(node.alternate, set)
  } else {
    set.add(UNKNOWN)
  }
}

function unquote(value: CssAttributeSelector['value']): string {
  if (value == undefined) {
    throw new Error('unexpted error')
  }

  if (value.type === 'Identifier') {
    return value.name
  }

  const str = value.value
  // eslint-disable-next-line unicorn/prefer-at
  if ((str[0] === str[str.length - 1] && str[0] === "'") || str[0] === '"') {
    // eslint-disable-next-line unicorn/prefer-negative-index
    return str.slice(1, str.length - 1)
  }

  return str
}

function isDynamicElement(node: SvelteElement): boolean {
  return node.name === 'svelte:element'
}
