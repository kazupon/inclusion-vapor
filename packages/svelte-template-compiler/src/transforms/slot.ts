// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-vapor`
// Author: Evan you (https://github.com/yyx990803) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-vapor/src/transforms/vSlot.ts

import { createSimpleExpression, NodeTypes } from '@vue-vapor/compiler-dom'
import { extend } from '@vue-vapor/shared'
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
  if (__DEV__) {
    console.log('transformVSlot', node.type)
  }

  if (!isSvelteElement(node)) {
    return
  }

  const children = node.children || []
  // const { parent } = context
  // const hasParentComponent =
  //   parent && isSvelteElement(parent.node) && parent.node.type === 'InlineComponent'
  const isSlotTemplate = node.type === 'SlotTemplate'
  const isComponent = node.type === 'InlineComponent'
  // const isSlotElement = !!(node.type === 'Slot' && hasParentComponent)
  // const isSlotAttrElement = !!(
  //   node.type === 'Element' &&
  //   findAttrs(node, 'slot') &&
  //   hasParentComponent
  // )
  // console.log(
  //   'transformVSlot => parent?.node.type, isSlotElement, isComponent, isSlotTemplate, isSlotAttrElement',
  //   parent?.node.type,
  //   isSlotElement,
  //   isComponent,
  //   isSlotTemplate,
  //   isSlotAttrElement
  // )
  const dir = convertVaporDirectiveForSlot(node)

  if (isComponent && children.length > 0) {
    return transformComponentSlot(node, dir, context as TransformContext<SvelteElement>)
  } else if (isSlotTemplate && dir) {
    return transformElementSlot(node, dir, context as TransformContext<SvelteElement>)
  } else if (!isComponent && dir) {
    // TODO:
    // context.options.onError(
    //   createCompilerError(ErrorCodes.X_V_SLOT_MISPLACED, dir.loc),
    // )
  }
}

function convertVaporDirectiveForSlot(node: SvelteElement): VaporDirectiveNode | undefined {
  const start = node.start
  const dirName = 'slot'
  let dirRawName = `v-${dirName}`

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
  let exp: SimpleExpressionNode | undefined = undefined
  if (slotScopeNodes.length > 0) {
    const firstSlotScopeNode = slotScopeNodes[0]
    const lastSlotScopeNode = slotScopeNodes[slotScopeNodes.length - 1] // eslint-disable-line unicorn/prefer-at
    const expContent = resolveSlotScopeExpression(slotScopeNodes)
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
    if (node.expression) {
      switch (node.expression.type) {
        case 'Identifier': {
          if (node.name === node.expression.name) {
            contents.push(node.name)
          } else {
            contents.push(`${node.name}: ${node.expression.name}`)
          }
          break
        }
        case 'ObjectExpression': {
          const keys = []
          for (const prop of node.expression.properties) {
            // TODO: more handling
            if (prop.type === 'Property' && prop.shorthand && prop.key.type === 'Identifier') {
              keys.push(prop.key.name)
            }
          }
          contents.push(`${node.name}: { ${keys.join(', ')} }`)
          break
        }
        case 'ArrayExpression': {
          const items = []
          for (const element of node.expression.elements) {
            if (element && element.type === 'Identifier') {
              items.push(element.name)
            }
          }
          contents.push(`${node.name}: [ ${items.join(', ')} ]`)

          break
        }
        // No default
      }
    } else {
      contents.push(node.name)
    }
  }
  return `{ ${contents.join(', ')} }`
}

// <Foo slot="foo">, <Foo slot={foo}>
function transformComponentSlot(
  node: SvelteElement,
  dir: VaporDirectiveNode | undefined,
  context: TransformContext<SvelteElement>
): ReturnType<NodeTransform> {
  const children = node.children || []
  const arg = dir && dir.arg
  const nonSlotAttrChildren = children.filter(
    // (n, i) => {
    //   console.log(
    //     'transformComponentSlot:nonSlotAttrChildren foreach',
    //     i,
    //     /*n,*/ isNonWhitespaceContent(n),
    //     isSvelteElement(n),
    //     findAttrs(n, 'slot')
    //   )
    //   return isNonWhitespaceContent(n) && !(isSvelteElement(n) && findAttrs(n, 'slot'))
    // }
    n => isNonWhitespaceContent(n) && !(isSvelteElement(n) && findAttrs(n, 'slot'))
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

    if (nonSlotAttrChildren.length > 0) {
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
  // TODO: we need to implement for `{#each}`?
  const vFor = undefined // findDir(node, 'for')
  // TODO: we need to implement for `{#if}`?
  const vIf = undefined // findDir(node, 'if')
  // TODO: we need to implement for `{:else}`, `{:else if}`?
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
  slotNode.children = (slotNode.children || []).map(child => {
    if (child.type === 'Element' || child.type === 'InlineComponent') {
      const slotAttr = findAttrs(child, 'slot')
      if (slotAttr) {
        // wrap with svelte:fragment for Svelte Element, which has `slot` attribute
        const attributes = (child.attributes as SvelteAttribute[]).filter(
          attr => attr.name !== 'slot'
        )
        const newElementNode = extend({}, child, {
          children: [...(child.children || [])],
          attributes
        })
        return {
          type: 'SlotTemplate',
          name: 'svelte:fragment',
          children: [newElementNode],
          attributes: [slotAttr],
          start: child.start,
          end: child.end
        }
      } else {
        return child
      }
    } else {
      return child
    }
  })
  slotNode.node = slotNode
  // console.log('createSlotBlock mapped slotNode', slotNode)

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
