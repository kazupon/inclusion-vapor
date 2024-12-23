// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `svelte`
// Author: Rich-Harris (https://github.com/Rich-Harris) and Svelte team and community
// Repository url: https://github.com/sveltejs/svelte/tree/svelte-4
// Code url: https://github.com/sveltejs/svelte/blob/svelte-4/packages/svelte/src/compiler/compile/css/Selector.js

import {
  createAttributeChunks,
  isSvelteAttribute,
  isSvelteBindingDirective,
  isSvelteClassDirective,
  isSvelteElement,
  isSvelteElseBlock,
  isSvelteSlot,
  isSvelteSpreadAttribute,
  isSvelteText
} from '../ir/svelte.ts'
import { hasChildren, hasName, isCombinator, isWhiteSpace } from './csstree.ts'

import type { AttributeSelector as CssAttributeSelector, CssNode } from 'css-tree'
import type { SvelteElement, SvelteMustacheTag, SvelteTemplateNode } from '../ir/index.ts'

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
      if (isWhiteSpace(child) || isCombinator(child)) {
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
    if (isCombinator(block.combinator) && block.combinator.name === ' ') {
      for (const ancestorBlock of blocks) {
        if (ancestorBlock.global) {
          continue
        }

        if (ancestorBlock.host) {
          toEncapsulate.push({ node, block })
          return true
        }

        let parent: SvelteElement | undefined = node
        while ((parent = getElementParent(parent))) {
          if (blockMightApplyToNode(ancestorBlock, parent) !== BlockAppliesToNode.NotPossible) {
            toEncapsulate.push({ node: parent, block: ancestorBlock })
          }
        }

        if (toEncapsulate.length > 0) {
          toEncapsulate.push({ node, block })
          return true
        }
      }

      if (blocks.every(block => block.global)) {
        toEncapsulate.push({ node, block })
        return true
      }
    } else if (isCombinator(block.combinator) && block.combinator.name === '>') {
      const hasGlobalParent = blocks.every(block => block.global)

      if (hasGlobalParent) {
        toEncapsulate.push({ node, block })
        return true
      }

      const parent = getElementParent(node)
      if (parent && applySelector(blocks, parent, toEncapsulate)) {
        toEncapsulate.push({ node, block })
        return true
      }

      return false
    } else if (
      isCombinator(block.combinator) &&
      (block.combinator.name === '+' || block.combinator.name === '~')
    ) {
      const [siblings, hasSlotSibling] = getPossibleElementSiblings(
        node,
        block.combinator.name === '+'
      )
      let hasMatch = false
      // NOTE: if we have :global(), we couldn't figure out what is selected within `:global` due to the
      // css-tree limitation that does not parse the inner selector of :global
      // so unless we are sure there will be no sibling to match, we will consider it as matched
      const hasGlobal = blocks.some(block => block.global)
      if (hasGlobal) {
        if (siblings.size === 0 && getElementParent(node) !== null && !hasSlotSibling) {
          return false
        }
        toEncapsulate.push({ node, block })
        return true
      }

      for (const possibleSibling of siblings.keys()) {
        // eslint-disable-next-line unicorn/prefer-spread
        if (applySelector(blocks.slice(), possibleSibling as SvelteElement, toEncapsulate)) {
          toEncapsulate.push({ node, block })
          hasMatch = true
        }
      }

      return hasMatch
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
        const nodeName = node.name.toLowerCase()
        if (
          !(
            WHITELIST_ATTRIBUTE_SELECTOR.has(nodeName) &&
            WHITELIST_ATTRIBUTE_SELECTOR.get(nodeName)?.has(selector.name.name.toLowerCase())
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

function getElementParent(node: SvelteTemplateNode): SvelteElement | undefined {
  let parent: SvelteTemplateNode | undefined = node
  while ((parent = parent.parent) && !isSvelteElement(parent));
  return parent
}

enum NodeExist {
  Probably = 0,
  Definitely = 1
}

function getPossibleElementSiblings(
  node: SvelteTemplateNode,
  adjacentOnly: boolean
): [Map<SvelteTemplateNode, NodeExist>, boolean] {
  // TODO:
  const result = new Map<SvelteTemplateNode, NodeExist>()

  let prev: SvelteTemplateNode | undefined = node
  let hasSlotSibling = false
  let slotSiblingFound = false

  while (([prev, slotSiblingFound] = findPreviousSibling(prev)) && prev) {
    if (isSvelteElement(prev)) {
      hasSlotSibling = hasSlotSibling || slotSiblingFound

      if (
        // eslint-disable-next-line unicorn/prefer-array-some
        !prev.attributes.find(attr => isSvelteAttribute(attr) && attr.name.toLowerCase() === 'slot')
      ) {
        result.set(prev, NodeExist.Definitely)
      }

      if (adjacentOnly) {
        break
      }
    } else if (prev.type === 'EachBlock' || prev.type === 'IfBlock' || prev.type === 'AwaitBlock') {
      const possibleLastChild = getPossibleLastChild(prev, adjacentOnly)
      addToMap(possibleLastChild, result)
      if (adjacentOnly && hasDefiniteElements(possibleLastChild)) {
        return [result, hasSlotSibling]
      }
    }
  }

  if (!prev || !adjacentOnly) {
    let parent: SvelteTemplateNode | undefined = node
    let skipEachForLastChild = node.type === 'ElseBlock'
    while (
      (parent = parent.parent) &&
      (parent.type === 'EachBlock' ||
        parent.type === 'IfBlock' ||
        parent.type === 'ElseBlock' ||
        parent.type === 'AwaitBlock')
    ) {
      const [possibleSiblings, slotSiblingFound] = getPossibleElementSiblings(parent, adjacentOnly)
      hasSlotSibling = hasSlotSibling || slotSiblingFound
      addToMap(possibleSiblings, result)

      if (parent.type === 'EachBlock') {
        if (skipEachForLastChild) {
          skipEachForLastChild = false
        } else {
          addToMap(getPossibleLastChild(parent, adjacentOnly), result)
        }
      } else if (parent.type === 'ElseBlock') {
        skipEachForLastChild = true
        parent = parent.parent
      }

      if (adjacentOnly && hasDefiniteElements(possibleSiblings)) {
        break
      }
    }
  }

  return [result, hasSlotSibling]
}

function findPreviousSibling(node: SvelteTemplateNode): [SvelteTemplateNode, boolean] {
  let currentNode: SvelteTemplateNode | undefined = node
  let hasSlotSibling = false

  do {
    if (isSvelteSlot(currentNode)) {
      hasSlotSibling = true
      const slotChildren: SvelteTemplateNode[] = currentNode.children || []
      if (slotChildren.length > 0) {
        // eslint-disable-next-line unicorn/prefer-at
        currentNode = slotChildren.slice(-1)[0] // go to its last child first
        continue
      }
    }
    while (!currentNode.prev && currentNode.parent && isSvelteSlot(currentNode.parent)) {
      currentNode = currentNode.parent
    }
    currentNode = currentNode.prev
  } while (currentNode != null && isSvelteSlot(currentNode)) // eslint-disable-line unicorn/no-null

  return [currentNode!, hasSlotSibling]
}

function getPossibleLastChild(
  block: SvelteTemplateNode,
  adjacentOnly: boolean
): Map<SvelteTemplateNode, NodeExist> {
  const result = new Map<SvelteTemplateNode, NodeExist>()
  const blockChildren = block.children || []

  switch (block.type) {
    case 'EachBlock': {
      const eachResult = loopChild(blockChildren, adjacentOnly)
      const elseResult = isSvelteElseBlock(block.else)
        ? loopChild(block.else.children, adjacentOnly)
        : new Map<SvelteTemplateNode, NodeExist>()
      const notExhaustive = !hasDefiniteElements(eachResult)
      if (notExhaustive) {
        markAsProbably(eachResult)
        markAsProbably(elseResult)
      }
      addToMap(eachResult, result)
      addToMap(elseResult, result)
      break
    }
    case 'IfBlock': {
      const ifResult = loopChild(blockChildren, adjacentOnly)
      const elseResult = isSvelteElseBlock(block.else)
        ? loopChild(block.else.children, adjacentOnly)
        : new Map<SvelteTemplateNode, NodeExist>()
      const notExhaustive = !hasDefiniteElements(ifResult) || !hasDefiniteElements(elseResult)
      if (notExhaustive) {
        markAsProbably(ifResult)
        markAsProbably(elseResult)
      }
      addToMap(ifResult, result)
      addToMap(elseResult, result)
      break
    }
    case 'AwaitBlock': {
      // FIXME: extend AwaitBlock for svelte template node
      const pendingResult = block.pending
        ? loopChild((block.pending as SvelteTemplateNode).children || [], adjacentOnly)
        : new Map<SvelteTemplateNode, NodeExist>()
      const thenResult = block.then
        ? loopChild((block.then as SvelteTemplateNode).children || [], adjacentOnly)
        : new Map<SvelteTemplateNode, NodeExist>()
      const catchResult = block.catch
        ? loopChild((block.catch as SvelteTemplateNode).children || [], adjacentOnly)
        : new Map<SvelteTemplateNode, NodeExist>()
      const notExhaustive =
        !hasDefiniteElements(pendingResult) ||
        !hasDefiniteElements(thenResult) ||
        !hasDefiniteElements(catchResult)
      if (notExhaustive) {
        markAsProbably(pendingResult)
        markAsProbably(thenResult)
        markAsProbably(catchResult)
      }
      addToMap(pendingResult, result)
      addToMap(thenResult, result)
      addToMap(catchResult, result)
      break
    }
    // No default
  }

  return result
}

function hasDefiniteElements(result: Map<SvelteTemplateNode, NodeExist>): boolean {
  if (result.size === 0) {
    return false
  }

  for (const exist of result.values()) {
    if (exist === NodeExist.Definitely) {
      return true
    }
  }

  return false
}

function addToMap(
  from: Map<SvelteTemplateNode, NodeExist>,
  to: Map<SvelteTemplateNode, NodeExist>
) {
  from.forEach((exist, element) => {
    to.set(element, higherExistence(exist, to.get(element)))
  })
}

function higherExistence(exist1: NodeExist | undefined, exist2: NodeExist | undefined): NodeExist {
  if (exist1 == undefined || exist2 == undefined) {
    // @ts-expect-error -- FIXME:
    return exist1 || exist2
  }
  return exist1 > exist2 ? exist1 : exist2
}

function markAsProbably(result: Map<SvelteTemplateNode, NodeExist>): void {
  for (const key of result.keys()) {
    result.set(key, NodeExist.Probably)
  }
}

function loopChild(
  children: SvelteTemplateNode[],
  adjacentOnly: boolean
): Map<SvelteTemplateNode, NodeExist> {
  const result = new Map<SvelteTemplateNode, NodeExist>()

  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i]

    if (isSvelteElement(child)) {
      result.set(child, NodeExist.Definitely)
      if (adjacentOnly) {
        break
      }
    } else if (
      child.type === 'EachBlock' ||
      child.type === 'IfBlock' ||
      child.type === 'AwaitBlock'
    ) {
      const childResult = getPossibleLastChild(child, adjacentOnly)
      addToMap(childResult, result)
      if (adjacentOnly && hasDefiniteElements(childResult)) {
        break
      }
    }
  }

  return result
}
