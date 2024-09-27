// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-vapor`
// Author: Evan you (https://github.com/yyx990803) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-vapor/src/transforms/vSlot.ts

import { createSimpleExpression, NodeTypes } from '@vue-vapor/compiler-dom'
import { generate } from 'astring'
import {
  convertSvelteLocation,
  DynamicFlag,
  findAttrs,
  IRSlotType,
  isSvelteElement,
  isSvelteLetDirective,
  isSvelteMustacheTag,
  isSvelteText
} from '../ir/index.ts'
// import { processChildren } from './children.ts';
import { isNonWhitespaceContent, newBlock, resolveExpression } from './utils.ts'

import type { SimpleExpressionNode } from '@vue-vapor/compiler-dom'
import type {
  IRSlots,
  IRSlotsStatic,
  SlotBlockIRNode,
  SvelteAttribute,
  SvelteBaseExpressionDirective,
  SvelteElement,
  VaporDirectiveNode
} from '../ir/index.ts'
import type { TransformContext } from './context.ts'
import type { NodeTransform } from './types.ts'

/**
 * NOTE: transform vapor slot from svelte slot (`slot` attr and `let` directive)
 * https://svelte.dev/docs/special-elements#slot-slot-key-value
 */
export const transformVSlot: NodeTransform = (node, context) => {
  if (!isSvelteElement(node)) {
    return
  }

  const children = node.children || []
  const { parent } = context
  const isSlotElement = !!(
    node.type === 'Slot' &&
    parent &&
    isSvelteElement(parent.node) &&
    parent.node.type === 'InlineComponent'
  )
  // console.log('isSlotElement', isSlotElement)
  const dir = convertVaporDirectiveForSlot(node, isSlotElement)

  const isComponent = node.type === 'InlineComponent'
  if (isComponent && children.length > 0) {
    return transformComponentSlot(node, dir, context as TransformContext<SvelteElement>)
  } else if (isSlotElement && dir) {
    return transformElementSlot(node, dir, context as TransformContext<SvelteElement>)
  } else if (!isComponent && dir) {
    // TODO:
    // context.options.onError(
    //   createCompilerError(ErrorCodes.X_V_SLOT_MISPLACED, dir.loc),
    // )
  }
}

function convertVaporDirectiveForSlot(
  node: SvelteElement,
  isSlotElement: boolean
): VaporDirectiveNode | undefined {
  const start = node.start
  const dirName = 'slot'
  let dirRawName = ''

  if (isSlotElement) {
    let arg: SimpleExpressionNode | undefined = undefined
    const attr = findAttrs(node, 'name')
    if (attr) {
      const [isStatic, argValue] = resolveSlotVaporDirectiveArgValue(attr)
      const argSource = `name="${argValue}"`
      arg = createSimpleExpression(
        argValue,
        isStatic,
        // TODO: fix correctly source location, need to align svelte AST ...
        convertSvelteLocation({ start, end: start + argSource.length }, argSource)
      )
      dirRawName = `#${argValue}`
    }

    const exp: SimpleExpressionNode | undefined = undefined

    const dir: VaporDirectiveNode = {
      type: NodeTypes.DIRECTIVE,
      name: dirName,
      rawName: dirRawName,
      modifiers: [],
      // TODO: fix correctly source location, need to align svelte AST ...
      loc: convertSvelteLocation({ start, end: start + dirRawName.length }, dirRawName),
      arg,
      exp
    }
    return dir
  } else {
    dirRawName = `v-${dirName}`

    let arg: SimpleExpressionNode | undefined = undefined
    const attr = findAttrs(node, 'slot')
    if (attr) {
      const [isStatic, argValue] = resolveSlotVaporDirectiveArgValue(attr)
      const argSource = `slot="${argValue}"`
      arg = createSimpleExpression(
        argValue,
        isStatic,
        // TODO: fix correctly source location, need to align svelte AST ...
        convertSvelteLocation({ start, end: start + argSource.length }, argSource)
      )
      dirRawName += `:${isStatic ? argValue : `[${argValue}]`}`
    }

    const slotScopeNodes = node.attributes.filter(attr => isSvelteLetDirective(attr))
    // console.log('isSlotElement false, slotScopeNodes', slotScopeNodes)
    let exp: SimpleExpressionNode | undefined = undefined
    if (slotScopeNodes.length > 0) {
      const firstSlotScopeNode = slotScopeNodes[0]
      const lastSlotScopeNode = slotScopeNodes[slotScopeNodes.length - 1] // eslint-disable-line unicorn/prefer-at
      const expContent = `{ ${resolveSlotScopeExpression(slotScopeNodes)} }`
      exp = createSimpleExpression(
        expContent,
        false,
        // TODO: fix correctly source location, need to align svelte AST ...
        convertSvelteLocation(
          { start: firstSlotScopeNode.start, end: lastSlotScopeNode.end },
          expContent
        )
      )
      dirRawName += `="${expContent}"`
    }

    const dir: VaporDirectiveNode = {
      type: NodeTypes.DIRECTIVE,
      name: dirName,
      rawName: dirRawName,
      modifiers: [],
      // TODO: fix correctly source location, need to align svelte AST ...
      loc: convertSvelteLocation({ start, end: start + dirRawName.length }, dirRawName),
      arg,
      exp
    }
    return dir
  }
}

type SlotDirectiveArgValueResult = [boolean, string] // [isStatic, argValue]

function resolveSlotVaporDirectiveArgValue(attr: SvelteAttribute): SlotDirectiveArgValueResult {
  if (attr.value.length === 0) {
    // TODO: error handling
    throw new Error('svelte slot attribute value is empty')
  }
  if (isSvelteText(attr.value[0])) {
    return [true, attr.value[0].data]
  } else if (isSvelteMustacheTag(attr.value[0])) {
    return [false, generate(attr.value[0].expression)]
  }

  throw new Error('unexpected svelte slot attribute value')
}

function resolveSlotScopeExpression(nodes: SvelteBaseExpressionDirective[]): string {
  const contents = []
  for (const node of nodes) {
    contents.push(node.name)
    // TODO: more complex expression handling
    if (
      node.expression &&
      node.expression.type === 'Identifier' &&
      node.name !== node.expression.name
    ) {
      contents.push(node.name)
    }
  }
  return contents.join(', ')
}

// <Foo slot="foo">, <Foo slot={foo}>
function transformComponentSlot(
  node: SvelteElement,
  dir: VaporDirectiveNode | undefined,
  context: TransformContext<SvelteElement>
): ReturnType<NodeTransform> {
  const children = node.children || []
  const arg = dir && dir.arg
  const nonSlotElementChildren = children.filter(
    n => isNonWhitespaceContent(n) && !(isSvelteElement(n) && n.type === 'Slot')
  )

  const [block, onExit] = createSlotBlock(node, dir, context)
  const { slots } = context

  return () => {
    onExit()

    const hasOtherSlots = !!slots.length // eslint-disable-line unicorn/explicit-length-check
    // if (dir && hasOtherSlots) {
    //   console.log('already has on-component slot - this is incorrect usage')
    //   // already has on-component slot - this is incorrect usage.
    //   // TODO:
    //   // context.options.onError(
    //   //   createCompilerError(ErrorCodes.X_V_SLOT_MIXED_SLOT_USAGE, dir.loc),
    //   // )
    //   return
    // }

    if (nonSlotElementChildren.length > 0) {
      if (hasStaticSlot(slots, 'default')) {
        // TODO:
        // context.options.onError(
        //   createCompilerError(
        //     ErrorCodes.X_V_SLOT_EXTRANEOUS_DEFAULT_SLOT_CHILDREN,
        //     nonSlotTemplateChildren[0].loc,
        //   ),
        // )
      } else {
        registerSlot(slots, arg, block)
        context.slots = slots
      }
    } else if (hasOtherSlots) {
      context.slots = slots
    }
  }
}

// <div slot="foo">
function transformElementSlot(
  node: SvelteElement,
  dir: VaporDirectiveNode,
  context: TransformContext<SvelteElement>
): ReturnType<NodeTransform> {
  context.dynamic.flags |= DynamicFlag.NON_TEMPLATE

  const arg = dir.arg && resolveExpression(dir.arg)
  const vFor = undefined // findDir(node, 'for')
  const vIf = undefined // findDir(node, 'if')
  const vElse = undefined // findDir(node, /^else(-if)?$/, true /* allowEmpty */)

  const { slots } = context
  const [block, onExit] = createSlotBlock(node, dir, context)

  if (!vFor && !vIf && !vElse) {
    const slotName = arg ? arg.isStatic && arg.content : 'default'
    if (slotName && hasStaticSlot(slots, slotName)) {
      // TODO:
      // context.options.onError(
      //   createCompilerError(ErrorCodes.X_V_SLOT_DUPLICATE_SLOT_NAMES, dir.loc),
      // )
    } else {
      registerSlot(slots, arg, block)
    }
  }

  return onExit
}

function createSlotBlock(
  slotNode: SvelteElement,
  dir: VaporDirectiveNode | undefined,
  context: TransformContext<SvelteElement>
): [SlotBlockIRNode, () => void] {
  const block: SlotBlockIRNode = newBlock(slotNode)
  block.props = dir && dir.exp
  const exitBlock = context.enterBlock(block)
  return [block, exitBlock]
}

function hasStaticSlot(slots: IRSlots[], name: string) {
  return slots.some(slot => {
    if (slot.slotType === IRSlotType.STATIC) return !!slot.slots[name]
  })
}

function registerSlot(
  slots: IRSlots[],
  name: SimpleExpressionNode | undefined,
  block: SlotBlockIRNode
) {
  const isStatic = !name || name.isStatic
  if (isStatic) {
    const staticSlots = ensureStaticSlots(slots)
    staticSlots[name ? name.content : 'default'] = block
  } else {
    slots.push({
      slotType: IRSlotType.DYNAMIC,
      name,
      fn: block
    })
  }
}

function ensureStaticSlots(slots: IRSlots[]): IRSlotsStatic['slots'] {
  let lastSlots = slots[slots.length - 1] // eslint-disable-line unicorn/prefer-at
  if (slots.length === 0 || lastSlots.slotType !== IRSlotType.STATIC) {
    slots.push(
      (lastSlots = {
        slotType: IRSlotType.STATIC,
        slots: {}
      })
    )
  }
  return lastSlots.slots
}
