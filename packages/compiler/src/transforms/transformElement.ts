// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-vapor`
// Author: Evan you (https://github.com/yyx990803) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-vapor/src/transforms/transformElement.ts

import {
  createSimpleExpression,
  createCompilerError,
  ErrorCodes,
  NodeTypes
} from '@vue-vapor/compiler-dom'
import { isVoidTag, extend } from '@vue-vapor/shared'
import {
  isSvelteElement,
  isBuiltInDirective,
  convertProps,
  DynamicFlag,
  IRDynamicPropsKind,
  IRPropsDynamicAttribute,
  IRNodeTypes
} from '../ir'
import { isValidHTMLNesting } from '../htmlNesting'
import { EMPTY_EXPRESSION, isReservedProp } from './utils'

import type { SimpleExpressionNode, AttributeNode } from '@vue-vapor/compiler-dom'
import type { IRProps, IRProp, IRPropsStatic, SvelteElement, VaporDirectiveNode } from '../ir'
import type { NodeTransform } from './types'
import type { TransformContext, DirectiveTransformResult } from '.'

export const transformElement: NodeTransform = (_node, context) => {
  return function postTransformElement() {
    const { node } = context
    if (!isSvelteElement(node)) {
      return
    }

    const { name: tag } = node
    const isComponent = node.type === 'InlineComponent'
    const propsResult = buildProps(node, context as TransformContext<SvelteElement>, isComponent)

    ;(isComponent ? transformComponentElement : transformNativeElement)(
      tag,
      propsResult,
      context as TransformContext<SvelteElement>
    )
  }
}

function transformComponentElement(
  tag: string,
  propsResult: PropsResult,
  context: TransformContext<SvelteElement>
) {
  const asset = true // TODO: might remove this
  context.component.add(tag)
  context.dynamic.flags |= DynamicFlag.NON_TEMPLATE | DynamicFlag.INSERT
  const root = context.root === context.parent && (context.parent.node.children || []).length === 1

  context.registerOperation({
    type: IRNodeTypes.CREATE_COMPONENT_NODE,
    id: context.reference(),
    tag,
    props: propsResult[0] ? propsResult[1] : [propsResult[1]],
    asset,
    root,
    slots: context.slots,
    once: context.inVOnce
  })
  context.slots = []
}

function transformNativeElement(
  tag: string,
  propsResult: PropsResult,
  context: TransformContext<SvelteElement>
) {
  const { scopeId } = context.options

  let template = ''
  template += `<${tag}`
  if (scopeId) {
    template += ` ${scopeId}`
  }

  if (propsResult[0] /* dynamic props */) {
    // TODO:
    // ...
  } else {
    for (const prop of propsResult[1]) {
      const { key, values } = prop
      if (key.isStatic && values.length === 1 && values[0].isStatic) {
        template += ` ${key.content}`
        if (values[0].content) template += `="${values[0].content}"`
      } else {
        context.registerEffect(values, {
          type: IRNodeTypes.SET_PROP,
          element: context.reference(),
          prop
        })
      }
    }
  }

  template += `>` + context.childrenTemplate.join('')
  // TODO remove unnecessary close tag, e.g. if it's the last element of the template
  if (!isVoidTag(tag)) {
    template += `</${tag}>`
  }

  if (
    context.parent &&
    context.parent.node.type === 'Element' &&
    !isValidHTMLNesting(context.parent.node.name as string, tag)
  ) {
    context.reference()
    context.dynamic.template = context.pushTemplate(template)
    context.dynamic.flags |= DynamicFlag.INSERT | DynamicFlag.NON_TEMPLATE
  } else {
    context.template += template
  }
}

export type PropsResult =
  | [dynamic: true, props: IRProps[], expressions: SimpleExpressionNode[]]
  | [dynamic: false, props: IRPropsStatic]

export function buildProps(
  node: SvelteElement,
  context: TransformContext<SvelteElement>,
  isComponent: boolean
): PropsResult {
  const props = convertProps(node)
  if (props.length === 0) {
    return [false, []]
  }

  const dynamicArgs: IRProps[] = []
  const dynamicExpr: SimpleExpressionNode[] = []
  let results: DirectiveTransformResult[] = []

  function pushMergeArg() {
    if (results.length > 0) {
      dynamicArgs.push(dedupeProperties(results))
      results = []
    }
  }

  for (const prop of props) {
    if (prop.type === NodeTypes.DIRECTIVE && !prop.arg) {
      if (prop.name === 'bind') {
        // v-bind="obj"
        if (prop.exp) {
          dynamicExpr.push(prop.exp)
          pushMergeArg()
          dynamicArgs.push({
            kind: IRDynamicPropsKind.EXPRESSION,
            value: prop.exp
          })
        } else {
          context.options.onError(createCompilerError(ErrorCodes.X_V_BIND_NO_EXPRESSION, prop.loc))
        }
        continue
      } else if (prop.name === 'on') {
        // v-on="obj"
        if (prop.exp) {
          if (isComponent) {
            dynamicExpr.push(prop.exp)
            pushMergeArg()
            dynamicArgs.push({
              kind: IRDynamicPropsKind.EXPRESSION,
              value: prop.exp,
              handler: true
            })
          } else {
            context.registerEffect(
              [prop.exp],

              {
                type: IRNodeTypes.SET_DYNAMIC_EVENTS,
                element: context.reference(),
                event: prop.exp
              }
            )
          }
        } else {
          context.options.onError(createCompilerError(ErrorCodes.X_V_ON_NO_EXPRESSION, prop.loc))
        }
        continue
      }
    }

    const result = transformProp(prop, node, context)
    if (result) {
      dynamicExpr.push(result.key, result.value)
      if (isComponent && !result.key.isStatic) {
        // v-bind:[name]="value" or v-on:[name]="value"
        pushMergeArg()
        dynamicArgs.push(
          extend(resolveDirectiveResult(result), {
            kind: IRDynamicPropsKind.ATTRIBUTE
          }) as IRPropsDynamicAttribute
        )
      } else {
        // other static props
        results.push(result)
      }
    }
  }

  // has dynamic key or v-bind="{}"
  if (dynamicArgs.length > 0 || results.some(({ key }) => !key.isStatic)) {
    // take rest of props as dynamic props
    pushMergeArg()
    return [true, dynamicArgs, dynamicExpr]
  }

  const irProps = dedupeProperties(results)
  return [false, irProps]
}

function transformProp(
  // prop: SvelteAttribute | SvelteSpreadAttribute | SvelteBaseDirective,
  prop: VaporDirectiveNode | AttributeNode,
  node: SvelteElement,
  context: TransformContext<SvelteElement>
): DirectiveTransformResult | void {
  const { name } = prop

  if (prop.type === NodeTypes.ATTRIBUTE) {
    if (isReservedProp(name)) {
      return
    }
    return {
      key: createSimpleExpression(prop.name, true, prop.nameLoc),
      value: prop.value
        ? createSimpleExpression(prop.value.content, true, prop.value.loc)
        : EMPTY_EXPRESSION
    }
  }

  const directiveTransform = context.options.directiveTransforms[name]
  if (directiveTransform) {
    return directiveTransform(prop, node, context)
  }

  if (!isBuiltInDirective(name)) {
    // const fromSetup =
    //   !__BROWSER__ && resolveSetupReference(`v-${name}`, context)
    // if (fromSetup) {
    //   name = fromSetup
    // } else {
    //   context.directive.add(name)
    // }
    // context.registerOperation({
    //   type: IRNodeTypes.WITH_DIRECTIVE,
    //   element: context.reference(),
    //   dir: prop,
    //   name,
    //   asset: !fromSetup,
    // })
  }
  /*
  const name = prop.name

  // for `SvelteAttribute`
  if (prop.type === 'Attribute') {
    if (isReservedProp(name)) {
      return
    }
    const key = createSimpleExpression(name, true, convertToSourceLocation(prop, name))
    // TODO: should be handled for multiple values
    const value = prop.value[0]
      ? createSimpleExpression(
        (prop.value[0] as SvelteText).data,
        true,
        convertToSourceLocation(
          prop.value[0] as SvelteBaseNode,
          (prop.value[0] as SvelteText).data
        )
      )
      : EMPTY_EXPRESSION
    return {
      key,
      value
    }
  }

  // for `SvelteSpreadAttribute`
  if (prop.type === 'Spread') {
    return
  }

  // for `SvelteBaseDirective`
  const directiveTransform = context.options.directiveTransforms[name]
  if (directiveTransform) {
    // TODO: should tweak directive transform for svelte
    // return directiveTransform(prop, node, context)
  }

  // TODO: should be handled for svelte built-in directives
  // if (!isBuiltInDirective(name)) {
  //   context.directive.add(name)
  //   context.registerOperation({
  //     type: IRNodeTypes.WITH_DIRECTIVE,
  //     element: context.reference(),
  //     dir: prop,
  //     name,
  //   })
  // }
  */
}

// Dedupe props in an object literal.
// Literal duplicated attributes would have been warned during the parse phase,
// however, it's possible to encounter duplicated `onXXX` handlers with different
// modifiers. We also need to merge static and dynamic class / style attributes.
function dedupeProperties(results: DirectiveTransformResult[]): IRProp[] {
  const knownProps: Map<string, IRProp> = new Map()
  const deduped: IRProp[] = []

  for (const result of results) {
    const prop = resolveDirectiveResult(result)
    // dynamic keys are always allowed
    if (!prop.key.isStatic) {
      deduped.push(prop)
      continue
    }
    const name = prop.key.content
    const existing = knownProps.get(name)
    if (existing) {
      if (name === 'style' || name === 'class') {
        mergePropValues(existing, prop)
      }
      // unexpected duplicate, should have emitted error during parse
    } else {
      knownProps.set(name, prop)
      deduped.push(prop)
    }
  }
  return deduped
}

function resolveDirectiveResult(prop: DirectiveTransformResult): IRProp {
  return extend({}, prop, {
    value: undefined,
    values: [prop.value]
  })
}

function mergePropValues(existing: IRProp, incoming: IRProp) {
  const newValues = incoming.values
  existing.values.push(...newValues)
}
