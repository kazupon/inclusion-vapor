// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-vapor`
// Author: Evan you (https://github.com/yyx990803) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-vapor/src/transforms/utils.ts

import { parseExpression } from '@babel/parser'
import { NodeTypes, createSimpleExpression, isLiteralWhitelisted } from '@vue-vapor/compiler-dom'
import { isGloballyAllowed, isString, makeMap } from '@vue-vapor/shared'
import { DynamicFlag, IRNodeTypes, convertToSourceLocation } from '../ir/index.ts'

import type { ParseResult as BabelParseResult } from '@babel/parser'
import type {
  Expression as BabelExpression,
  BigIntLiteral,
  NumericLiteral,
  StringLiteral
} from '@babel/types'
import type { ExpressionNode, SimpleExpressionNode } from '@vue-vapor/compiler-dom'
import type {
  BlockIRNode,
  IRDynamicInfo,
  SvelteBaseNode,
  SvelteEachBlock,
  SvelteIfBlock,
  SvelteMustacheTag
} from '../ir/index.ts'
import type { TransformContext } from './context.ts'
import type { NodeTransform, StructuralDirectiveTransform } from './types.ts'

export const isReservedProp: ReturnType<typeof makeMap> = /*#__PURE__*/ makeMap(
  // the leading comma is intentional so empty string "" is also included
  ',key,ref,ref_for,ref_key,'
)

export const EMPTY_EXPRESSION: ReturnType<typeof createSimpleExpression> = createSimpleExpression(
  '',
  true
)

export const newDynamic = (): IRDynamicInfo => ({
  flags: DynamicFlag.REFERENCED,
  children: []
})

export const newBlock = (node: BlockIRNode['node']): BlockIRNode => ({
  type: IRNodeTypes.BLOCK,
  node,
  dynamic: newDynamic(),
  effect: [],
  operation: [],
  returns: []
})

export function getExpSource(exp: ExpressionNode): string {
  return exp.type === NodeTypes.SIMPLE_EXPRESSION ? exp.content : exp.loc.source
}

export function isConstantExpression(exp: SimpleExpressionNode): boolean {
  return (
    isLiteralWhitelisted(exp.content) ||
    isGloballyAllowed(exp.content) ||
    getLiteralExpressionValue(exp) !== null
  )
}

export function resolveExpression(exp: SimpleExpressionNode): SimpleExpressionNode {
  if (!exp.isStatic) {
    const value = getLiteralExpressionValue(exp)
    if (value !== null) {
      return createSimpleExpression('' + value, true, exp.loc)
    }
  }
  return exp
}

export function resolveSimpleExpression<
  T extends SvelteMustacheTag | SvelteIfBlock | SvelteEachBlock
>(
  node: SvelteMustacheTag | SvelteIfBlock | SvelteEachBlock,
  context: TransformContext<T>
): SimpleExpressionNode {
  const { expression } = node as { expression: SvelteMustacheTag['expression'] }
  const base = node as SvelteBaseNode

  const content = resolveSource(expression, context, { start: base.start, end: base.end })
  const loc = expression.loc || convertToSourceLocation(base, content) // FIXME: twaeak loc type
  const isStatic =
    expression.type === 'Identifier'
      ? false
      : expression.type === 'Literal' && !isString(expression.value)

  let ast: BabelParseResult<BabelExpression> | false = false
  ast = parseBabelExpression(content, isStatic, context)

  const exp = createSimpleExpression(
    content,
    isStatic,
    loc as ReturnType<typeof convertToSourceLocation>
  )
  exp.ast = ast ?? null // eslint-disable-line unicorn/no-null

  return exp
}

export function resolveSource(
  node: SvelteMustacheTag['expression'],
  context: TransformContext,
  defaultPosition: { start: number; end: number }
): string {
  switch (node.type) {
    case 'Identifier': {
      return node.name
    }
    case 'Literal': {
      return node.raw || context.ir.source.slice(defaultPosition.start, defaultPosition.end)
    }
    case 'MemberExpression': {
      // TODO: we need to extend svelte estree ...
      return context.ir.source.slice(
        (node as unknown as { start: number }).start,
        (node as unknown as { end: number }).end
      )
    }
    case 'BinaryExpression': {
      return context.ir.source.slice(
        (node as unknown as { start: number }).start,
        (node as unknown as { end: number }).end
      )
    }
    default: {
      return context.ir.source.slice(defaultPosition.start, defaultPosition.end)
    }
  }
}

export function parseBabelExpression(
  content: string,
  isStatic: boolean,
  context: TransformContext
): BabelParseResult<BabelExpression> | false {
  // HACK: we need to parse the expression in prefix mode to resolve scope IDs
  return !isStatic && context.options.prefixIdentifiers
    ? parseExpression(` ${content}`, {
        sourceType: 'module',
        plugins: context.options.expressionPlugins
      })
    : false
}

// export function wrapTemplate(node: SvelteTemplateNode, dirs: string[]): TemplateNode {
//   if (node.tagType === ElementTypes.TEMPLATE) {
//     return node
//   }
//
//   const reserved: Array<AttributeNode | DirectiveNode> = []
//   const pass: Array<AttributeNode | DirectiveNode> = []
//   node.props.forEach(prop => {
//     if (prop.type === NodeTypes.DIRECTIVE && dirs.includes(prop.name)) {
//       reserved.push(prop)
//     } else {
//       pass.push(prop)
//     }
//   })
//
//   return extend({}, node, {
//     type: NodeTypes.ELEMENT,
//     tag: 'template',
//     props: reserved,
//     tagType: ElementTypes.TEMPLATE,
//     children: [extend({}, node, { props: pass } as TemplateChildNode)],
//   } as Partial<TemplateNode>)
// }

export function getLiteralExpressionValue(
  exp: SimpleExpressionNode
): number | string | boolean | null {
  if (!__BROWSER__ && exp.ast) {
    if (['StringLiteral', 'NumericLiteral', 'BigIntLiteral'].includes(exp.ast.type)) {
      return (exp.ast as StringLiteral | NumericLiteral | BigIntLiteral).value
    } else if (exp.ast.type === 'TemplateLiteral' && exp.ast.expressions.length === 0) {
      return exp.ast.quasis[0].value.cooked!
    }
  }
  // eslint-disable-next-line unicorn/no-null
  return exp.isStatic ? exp.content : null
}

export function createStructuralDirectiveTransform(
  _name: string | string[],
  _fn: StructuralDirectiveTransform
): NodeTransform {
  // TODO: transform vapor structurel directive from svelte logic blocks

  return (_node, _context) => {
    // TODO:
  }
}
