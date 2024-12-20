// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `@vue/compiler-vapor`
// Author: Evan you (https://github.com/yyx990803) and Vapor team (https://github.com/orgs/vuejs/teams/vapor)
// Repository url: https://github.com/vuejs/core-vapor
// Code url: https://github.com/vuejs/core-vapor/blob/6608bb31973d35973428cae4fbd62026db068365/packages/compiler-vapor/src/transforms/transformElement.ts

import {
  createCompilerError,
  createSimpleExpression,
  ErrorCodes,
  isStaticArgOf,
  NodeTypes
} from '@vue-vapor/compiler-dom'
import { camelize, capitalize, extend, isVoidTag } from '@vue-vapor/shared'
import { isValidHTMLNesting } from '../htmlNesting.ts'
import {
  convertProps,
  convertVaporDirectiveComponentExpression,
  DynamicFlag,
  IRDynamicPropsKind,
  IRNodeTypes,
  isSvelteComment,
  isSvelteComponentTag,
  isSvelteElement
} from '../ir/index.ts'
import { EMPTY_EXPRESSION, isReservedProp } from './utils.ts'

import type { AttributeNode, SimpleExpressionNode } from '@vue-vapor/compiler-dom'
import type {
  IRProp,
  IRProps,
  IRPropsDynamicAttribute,
  IRPropsStatic,
  SvelteComponentTag,
  SvelteElement,
  VaporDirectiveNode
} from '../ir/index.ts'
import type { TransformContext } from './context.ts'
import type { DirectiveTransformResult } from './index.ts'
import type { NodeTransform } from './types.ts'

export const transformElement: NodeTransform = (_node, context) => {
  if (__DEV__) {
    console.log(
      'transformElement',
      _node.type,
      // @ts-expect-error -- IGNORE
      _node?.name
    )
  }

  return function postTransformElement() {
    const { node } = context
    if (!isSvelteElement(node)) {
      return
    }
    if (node.type === 'Slot' || node.type === 'SlotTemplate') {
      return
    }

    const isComponent = node.type === 'InlineComponent'
    const isDynamicComponent = isSvelteComponentTag(node)

    // apply scoped style
    context.applyScopedCss(node)

    const propsResult = buildProps(
      node,
      context as TransformContext<SvelteElement>,
      isComponent,
      isDynamicComponent
    )

    // TODO:
    /*
    let { parent } = context
    while (
      parent &&
      parent.parent &&
      parent.node.type === NodeTypes.ELEMENT &&
      parent.node.tagType === ElementTypes.TEMPLATE
    ) {
      parent = parent.parent
    }
    const singleRoot =
      context.root === parent &&
      parent.node.children.filter(child => child.type !== NodeTypes.COMMENT)
        .length === 1
    */
    const { parent } = context
    const singleRoot =
      context.root === parent &&
      (parent.node.children || []).filter(child => !isSvelteComment(child)).length === 1

    ;(isComponent ? transformComponentElement : transformNativeElement)(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      node as any,
      propsResult,
      singleRoot,
      context as TransformContext<SvelteElement>,
      isDynamicComponent
    )
  }
}

function transformComponentElement(
  node: SvelteComponentTag,
  propsResult: PropsResult,
  singleRoot: boolean,
  context: TransformContext<SvelteElement>,
  isDynamicComponent: boolean
) {
  const dynamicComponent = isDynamicComponent ? resolveDynamicComponent(node) : undefined

  let { name: tag } = node
  let asset = true

  if (dynamicComponent) {
    // rename tag name to vapor component tag
    if (tag === 'svelte:component') {
      tag = 'component'
    }
  } else {
    const fromSetup = resolveSetupReference(tag, context)
    if (fromSetup) {
      tag = fromSetup
      asset = false
    }

    const dotIndex = tag.indexOf('.')
    if (dotIndex > 0) {
      const ns = resolveSetupReference(tag.slice(0, dotIndex), context)
      if (ns) {
        tag = ns + tag.slice(dotIndex)
        asset = false
      }
    }

    if (asset) {
      context.component.add(tag)
    }
  }

  context.dynamic.flags |= DynamicFlag.NON_TEMPLATE | DynamicFlag.INSERT
  // TODO:
  // const root = context.root === context.parent && (context.parent.node.children || []).length === 1

  context.registerOperation({
    type: IRNodeTypes.CREATE_COMPONENT_NODE,
    id: context.reference(),
    tag,
    props: propsResult[0] ? propsResult[1] : [propsResult[1]],
    asset,
    root: singleRoot,
    slots: [...context.slots],
    once: context.inVOnce,
    dynamic: dynamicComponent
  })
  context.slots = []
}

function resolveDynamicComponent(node: SvelteComponentTag) {
  const expression = node.expression
  if (!expression) {
    return
  }
  return convertVaporDirectiveComponentExpression(node).exp
}

function resolveSetupReference(name: string, context: TransformContext): string | undefined {
  const bindings = context.options.bindingMetadata
  if (!bindings || bindings.__isScriptSetup === false) {
    return
  }

  const camelName = camelize(name)
  const PascalName = capitalize(camelName)
  return bindings[name]
    ? name
    : bindings[camelName]
      ? camelName
      : bindings[PascalName]
        ? PascalName
        : undefined
}

function transformNativeElement(
  node: SvelteElement,
  propsResult: PropsResult,
  singleRoot: boolean,
  context: TransformContext<SvelteElement>
) {
  const { name: tag } = node
  // TODO: remove
  // const { scopeId } = context.options

  let template = ''
  template += `<${tag}`
  // TODO: remove
  // if (scopeId) {
  //   template += ` ${scopeId}`
  // }

  let staticProps = false
  const dynamicProps: string[] = []
  if (propsResult[0] /* dynamic props */) {
    const [, dynamicArgs, expressions] = propsResult
    context.registerEffect(expressions, {
      type: IRNodeTypes.SET_DYNAMIC_PROPS,
      element: context.reference(),
      props: dynamicArgs,
      root: singleRoot
    })
  } else {
    for (const prop of propsResult[1]) {
      const { key, values } = prop
      if (key.isStatic && values.length === 1 && values[0].isStatic) {
        staticProps = true
        template += ` ${key.content}`
        if (values[0].content) {
          template += `="${values[0].content}"`
        }
      } else {
        dynamicProps.push(key.content)
        context.registerEffect(values, {
          type: IRNodeTypes.SET_PROP,
          element: context.reference(),
          prop,
          root: singleRoot
        })
      }
    }
  }

  if (singleRoot) {
    context.registerOperation({
      type: IRNodeTypes.SET_INHERIT_ATTRS,
      staticProps: staticProps,
      dynamicProps: propsResult[0] ? true : dynamicProps
    })
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
  isComponent: boolean,
  isDynamicComponent?: boolean
): PropsResult {
  // context.options.scopedStyleApplyer?.(node, context)

  // convert from svelte props to vapor props
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

    // TODO:
    // do we need to handle for svelte dynamic component ?
    // svelte dynamic component is not supported statically...

    // exclude `this` prop for <component>
    if (
      (isDynamicComponent && prop.type === NodeTypes.ATTRIBUTE && prop.name === 'this') ||
      (prop.type === NodeTypes.DIRECTIVE && prop.name === 'bind' && isStaticArgOf(prop.arg, 'this'))
    ) {
      continue
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
