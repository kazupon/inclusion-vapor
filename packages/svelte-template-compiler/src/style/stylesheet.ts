// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `svelte`
// Author: Rich-Harris (https://github.com/Rich-Harris) and Svelte team and community
// Repository url: https://github.com/sveltejs/svelte/tree/svelte-4
// Code url: https://github.com/sveltejs/svelte/blob/svelte-4/packages/svelte/src/compiler/compile/css/Stylesheet.js

import { walkAST } from 'ast-kit'
import { pushArray } from 'inclusion-vapor-shared'
import { MagicStringAST } from 'magic-string-ast'
import { createAttributeChunks, isSvelteSpreadAttribute, isSvelteText } from '../ir/index.ts'
import { hasChildren, hasProperty } from './csstree.ts'
import { Selector, applySelector } from './selector.ts'

import type {
  Atrule as CssAtrule,
  Declaration as CssDeclaration,
  CssNode,
  Rule as CssRule
} from '@types/css-tree'
import type { SvelteAttribute, SvelteElement, SvelteStyle } from '../ir/index.ts'
import type { CssNodeWithChildren } from './csstree.ts'
import type { Block } from './selector.ts'

export interface SvelteStylesheetOptions {
  dev?: boolean
  cssHash?: (css: string, hash: (str: string) => string) => string
}

const getDefaultCssHash = (css: string, hash: (str: string) => string): string =>
  `svelte-${hash(css)}`

export class SvelteStylesheet {
  ast: SvelteStyle
  dev: boolean = true
  source: string = ''
  id: string = ''
  children: (Rule | Atrule)[] = []
  nodesWithCssClass: Set<SvelteElement> = new Set<SvelteElement>()
  keyframes: Map<string, string> = new Map()

  constructor(ast: SvelteStyle, options: SvelteStylesheetOptions = {}) {
    const { dev = true, cssHash = getDefaultCssHash } = options
    console.log(dev, cssHash(ast.content.styles, hash), ast.content.styles)

    this.dev = dev
    this.ast = ast
    this.source = ast.content.styles
    this.id = cssHash(ast.content.styles, hash)

    const stack: Atrule[] = []
    let depth: number = 0
    let currentAtrule: Atrule | null = null // eslint-disable-line unicorn/no-null

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore -- css-tree types are not up-to-date
    walkAST<CssNode>(ast, {
      enter: node => {
        if (node.type === 'Atrule') {
          const atrule = new Atrule(node)
          stack.push(atrule)

          if (currentAtrule) {
            currentAtrule.children.push(atrule)
          } else if (depth <= 1) {
            this.children.push(atrule)
          }

          if (isKeyFramesNode(node)) {
            // node.prelude.children.forEach((expression) => {
            //   if (expression.type === 'Identifier' && !expression.name.startsWith('-global-')) {
            //     this.keyframes.set(expression.name, `${this.id}-${expression.name}`);
            //   }
            // });
            if (node.prelude && hasChildren(node.prelude)) {
              node.prelude.children.forEach((expression: CssNode) => {
                if (expression.type === 'Identifier' && !expression.name.startsWith('-global-')) {
                  this.keyframes.set(expression.name, `${this.id}-${expression.name}`)
                }
              })
            }
          } else if (hasDeclarationInAtrule(node)) {
            // const at_rule_declarations = node.block.children
            //   .filter((node) => node.type === 'Declaration')
            //   .map((node) => new Declaration(node));
            // push_array(atrule.declarations, at_rule_declarations);
            const atruleDeclarations = node
              .block!.children.filter(node => node.type === 'Declaration')
              .map(node => new Declaration(node)) as unknown as Declaration[]
            pushArray(atrule.declarations, atruleDeclarations)
          }

          currentAtrule = atrule
        } else if (node.type === 'Rule') {
          const rule = new Rule(node, currentAtrule)
          // const rule = new Rule(node, this, current_atrule);
          if (currentAtrule) {
            currentAtrule.children.push(rule)
          } else if (depth <= 1) {
            this.children.push(rule)
          }
        }

        depth += 1
      },
      leave: node => {
        if (node.type === 'Atrule') {
          stack.pop()
          // eslint-disable-next-line unicorn/prefer-at
          currentAtrule = stack[stack.length - 1]
        }
        depth -= 1
      }
    })
  }

  apply(node: SvelteElement, everytime = true): void {
    for (const child of this.children) {
      apply(node, child, this)
    }
    if (everytime) {
      this.reify()
    }
  }

  reify(): void {
    // apply scoped class id to class attribute
    reify(this)
  }

  render(file: string): { code: string; map: ReturnType<MagicStringAST['generateMap']> } {
    const max = Math.max(...this.children.map(css => getMaxAmountClassSpecificityIncreased(css)))
    const code = new MagicStringAST(this.source)

    for (const child of this.children) {
      transform(child, code, this.id, this.keyframes, max)
    }

    let c = 0
    for (const child of this.children) {
      if (!isUsed(child, this.dev)) {
        code.remove(c, child.node.start!)
        minify(child, code, this.dev)
        c = child.node.end!
      }
    }
    code.remove(c, this.source.length)

    return {
      code: code.toString(),
      map: code.generateMap({
        includeContent: true,
        source: '', // TODO: this.filename
        file
      })
    }
  }
}

// eslint-disable-next-line regexp/no-unused-capturing-group
const RE_CSS_BROWSER_PREFIX = /^-((webkit)|(moz)|(o)|(ms))-/

function removeCssPrefix(name: string): string {
  return name.replace(RE_CSS_BROWSER_PREFIX, '')
}

const isKeyFramesNode = (node: { name: string }) => removeCssPrefix(node.name) === 'keyframes'

function hasDeclarationInAtrule({ block }: CssAtrule): CssDeclaration | null | undefined {
  return (
    block &&
    block.children &&
    (block.children as unknown as CssNode[]).find(node => node.type === 'Declaration')
  )
}

class Rule {
  node: CssRule
  selectors: Selector[]
  parent: Atrule | null
  declarations: Declaration[]

  constructor(node: CssRule, parent: Atrule | null) {
    this.node = node
    this.parent = parent
    this.selectors = hasChildren(node.prelude)
      ? (node.prelude.children.map(node => new Selector(node)) as unknown as Selector[])
      : []
    // this.declarations = node.block.children.map(
    //   node => new Declaration(node)
    // ) as unknown as Declaration[]

    this.declarations = node.block.children
      .filter(hasProperty) // eslint-disable-line unicorn/no-array-callback-reference
      .map(node => new Declaration(node)) as unknown as Declaration[]
  }
}

class Atrule {
  node: CssAtrule
  children: (Rule | Atrule)[] = []
  declarations: Declaration[] = []

  constructor(node: CssAtrule) {
    this.node = node
  }
}

class Declaration {
  node: CssDeclaration

  constructor(node: CssDeclaration) {
    this.node = node
  }
}

function apply(
  node: SvelteElement,
  css: Rule | Atrule | Selector,
  stylesheet: SvelteStylesheet
): void {
  if (css instanceof Rule) {
    // for Rule
    for (const selector of css.selectors) {
      apply(node, selector, stylesheet)
    }
  } else if (css instanceof Atrule) {
    // for Atrule
    if (
      css.node.name === 'container' ||
      css.node.name === 'media' ||
      css.node.name === 'supports' ||
      css.node.name === 'layer'
    ) {
      for (const child of css.children) {
        apply(node, child, stylesheet)
      }
    } else if (isKeyFramesNode(css.node)) {
      for (const rule of css.children) {
        if (rule instanceof Rule) {
          for (const selector of rule.selectors) {
            selector.used = true
          }
        }
      }
    }
  } else if (css instanceof Selector) {
    // for Selector
    const toEncapsulate: { node: SvelteElement; block: Block }[] = []

    // eslint-disable-next-line unicorn/prefer-spread
    applySelector(css.localBlocks.slice(), node, toEncapsulate)

    if (toEncapsulate.length > 0) {
      for (const { node: templateNode, block } of toEncapsulate) {
        stylesheet.nodesWithCssClass.add(templateNode)
        block.shouldEncapsulate = true
      }
      css.used = true
    }
  } else {
    throw new TypeError('Invalid css type')
  }
}

// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)
// Forked from `svelte`
// Author: Rich-Harris (https://github.com/Rich-Harris) and Svelte team and community
// Repository url: https://github.com/sveltejs/svelte/tree/svelte-4
// Code url: https://github.com/sveltejs/svelte/blob/svelte-4/packages/svelte/src/compiler/compile/nodes/Element.js#L1305-L1343

function reify(stylesheet: SvelteStylesheet): void {
  stylesheet.nodesWithCssClass.forEach(node => {
    if (node.attributes.some(attr => isSvelteSpreadAttribute(attr))) {
      // this.needs_manual_style_scoping = true
      return
    }
    const { id } = stylesheet
    const classAttribute = node.attributes.find(attr => attr.name === 'class')
    if (classAttribute && !(classAttribute.value === true)) {
      const chunks = createAttributeChunks(classAttribute)
      if (chunks.length === 1 && isSvelteText(chunks[0])) {
        chunks[0].data += ` ${id}`
      } else {
        if (Array.isArray(classAttribute.value)) {
          classAttribute.value.push({
            type: 'Text',
            raw: ` ${id}`,
            data: ` ${id}`
          })
        } else {
          console.warn('unexpected node')
        }
      }
    } else {
      node.attributes.push({
        type: 'Attribute',
        name: 'class',
        value: [
          {
            type: 'Text',
            raw: id,
            data: id
          }
        ]
      } as SvelteAttribute)
    }
  })
}

function getMaxAmountClassSpecificityIncreased(css: Rule | Atrule | Selector): number {
  if (css instanceof Rule) {
    // for Rule
    return Math.max(
      ...css.selectors.map(selector => getMaxAmountClassSpecificityIncreased(selector))
    )
  } else if (css instanceof Atrule) {
    // for Atrule
    return Math.max(...css.children.map(rule => getMaxAmountClassSpecificityIncreased(rule)))
  } else if (css instanceof Selector) {
    // for Selector
    let count = 0
    for (const block of css.blocks) {
      if (block.shouldEncapsulate) {
        count++
      }
    }
    return count
  } else {
    throw new TypeError('Invalid css type')
  }
}

function transform(
  css: Rule | Atrule | Selector | Declaration,
  code: MagicStringAST,
  id: string,
  keyframes: Map<string, string>,
  max: number
): void {
  if (css instanceof Rule) {
    // for Rule
    if (css.parent?.node.type === 'Atrule' && isKeyFramesNode(css.parent.node)) {
      return
    }
    const attr = `.${id}`
    for (const selector of css.selectors) {
      transform(selector, code, attr, keyframes, max)
    }
    for (const declaration of css.declarations) {
      transform(declaration, code, id, keyframes, max)
    }
  } else if (css instanceof Atrule) {
    // for Atrule
    if (isKeyFramesNode(css.node) && css.node.prelude && hasChildren(css.node.prelude)) {
      // @ts-expect-error -- FIXME: `name` type is not defined
      for (const { type, name, start, end } of css.node.prelude.children) {
        if (type === 'Identifier') {
          if (name.startsWith('-global-')) {
            code.remove(start!, start! + 8)
            for (const rule of css.children) {
              if (rule instanceof Rule) {
                for (const selector of rule.selectors) {
                  selector.used = true
                }
              }
            }
          } else {
            code.update(start!, end!, keyframes.get(name)!)
          }
        }
      }
    }
    for (const child of css.children) {
      transform(child, code, id, keyframes, max)
    }
  } else if (css instanceof Selector) {
    // for Selector
    const amountClassSpecificityToIncrease =
      max - css.blocks.filter(block => block.shouldEncapsulate).length
    css.blocks.forEach((block, index) => {
      if (block.global) {
        removeGlobalResudoClass(code, block.selectors[0] as CssNodeWithChildren)
      }
      if (block.shouldEncapsulate) {
        encapsulateBlock(
          code,
          block,
          index === css.blocks.length - 1 ? id.repeat(amountClassSpecificityToIncrease + 1) : id
        )
      }
    })
  } else if (css instanceof Declaration) {
    // for Declaration
    const property = removeCssPrefix(css.node.property.toLowerCase())
    if (
      (property === 'animation' || property === 'animation-name') &&
      hasChildren(css.node.value)
    ) {
      for (const block of css.node.value.children) {
        if (block.type === 'Identifier') {
          const name = block.name
          if (keyframes.has(name)) {
            code.update(block.start!, block.end!, keyframes.get(name)!)
          }
        }
      }
    }
  } else {
    throw new TypeError('Invalid css type')
  }
}

function removeGlobalResudoClass(code: MagicStringAST, selector: CssNodeWithChildren): void {
  if (selector.children == undefined) {
    throw new TypeError('selector children is null')
  }
  const selectorChildren = selector.children as unknown as CssNode[]
  const first = selectorChildren[0]
  // eslint-disable-next-line unicorn/prefer-at
  const last = selectorChildren[selectorChildren.length - 1]
  code.remove(selector.start!, first.start!).remove(last.end!, selector.end!)
}

function encapsulateBlock(code: MagicStringAST, block: Block, attr: string): void {
  for (const selector of block.selectors) {
    if (selector.type === 'PseudoClassSelector' && selector.name === 'global') {
      removeGlobalResudoClass(code, selector)
    }
  }
  let i = block.selectors.length
  while (i--) {
    const selector = block.selectors[i]
    if (selector.type === 'PseudoElementSelector' || selector.type === 'PseudoClassSelector') {
      if (selector.name !== 'root' && selector.name !== 'host' && i === 0) {
        code.prependRight(selector.start!, attr)
      }
      continue
    }
    if (selector.type === 'TypeSelector' && selector.name === '*') {
      code.update(selector.start!, selector.end!, attr)
    } else {
      code.appendLeft(selector.end!, attr)
    }
    break
  }
}

function minify(
  css: Rule | Atrule | Selector | Declaration,
  _code: MagicStringAST,
  _dev: boolean
): void {
  if (css instanceof Rule) {
    // TODO:
  } else if (css instanceof Atrule) {
    // TODO:
  } else if (css instanceof Selector) {
    // TODO:
  } else if (css instanceof Declaration) {
    // TODO:
  } else {
    throw new TypeError('Invalid css type')
  }
}

function isUsed(css: Rule | Atrule | Selector, dev: boolean): boolean {
  if (css instanceof Rule) {
    // for Rule
    if (css.parent?.node.type === 'Atrule' && isKeyFramesNode(css.parent.node)) {
      return true
    }
    if (css.declarations.length === 0) {
      return dev
    }
    return css.selectors.some(selector => isUsed(selector, dev))
  } else if (css instanceof Atrule) {
    // for Atrule
    return true
  } else if (css instanceof Selector) {
    // for Selector
    return css.used
  } else {
    throw new TypeError('Invalid css type')
  }
}

// SPDX-License-Identifier: MIT
// Forked and Modified from `svelte`
// Author: Rich Harris (https://github.com/Rich-Harris), svelte team and svelte community
// Repository url: https://github.com/sveltejs/svelte/tree/svelte-4
// Code url: https://github.com/sveltejs/svelte/blob/svelte-4/packages/svelte/src/compiler/compile/utils/hash.js

const RE_RETURN_CHARACTERS = /\r/g

function hash(str: string): string {
  // eslint-disable-next-line unicorn/prefer-string-replace-all
  const s = str.replace(RE_RETURN_CHARACTERS, '')
  let hash = 5381
  let i = s.length

  while (i--) {
    // eslint-disable-next-line unicorn/prefer-code-point
    hash = ((hash << 5) - hash) ^ s.charCodeAt(i)
  }

  return (hash >>> 0).toString(36)
}
