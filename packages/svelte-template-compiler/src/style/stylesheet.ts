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
import { hash } from '../utils.ts'
import { hasChildren, hasProperty, isCombinator, isWhiteSpace } from './csstree.ts'
import { Selector, applySelector } from './selector.ts'

import type {
  Atrule as CssAtrule,
  Declaration as CssDeclaration,
  CssNode,
  Rule as CssRule
} from 'css-tree'
import type { SvelteAttribute, SvelteElement, SvelteStyle } from '../ir/index.ts'
import type { CssNodeWithChildren } from './csstree.ts'
import type { Block } from './selector.ts'

export interface SvelteStylesheetOptions {
  ast: SvelteStyle
  source: string
  filename?: string
  dev?: boolean
  cssHash?: ((css: string, hash: (str: string) => string) => string) | string
}

const getDefaultCssHash = (css: string, hash: (str: string) => string): string =>
  `svelte-${hash(css)}`

export class SvelteStylesheet {
  ast: SvelteStyle
  dev: boolean = true
  source: string = ''
  filename: string = ''
  id: string = ''
  children: (Rule | Atrule)[] = []
  nodesWithCssClass: Set<SvelteElement> = new Set<SvelteElement>()
  applyCssWithNode: Set<SvelteElement> = new Set<SvelteElement>()
  keyframes: Map<string, string> = new Map()
  constructor(options: SvelteStylesheetOptions) {
    const { ast, source, filename, dev = true, cssHash = getDefaultCssHash } = options

    this.dev = dev
    this.ast = ast
    this.source = source
    this.filename = filename || ''
    this.id = typeof cssHash === 'string' ? cssHash : cssHash(source, hash)

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

  apply(node: SvelteElement, incremental = false): void {
    // for (const child of this.children) {
    //   apply(node, child, this)
    // }
    for (let i = 0; i < this.children.length; i += 1) {
      apply(node, this.children[i], this)
    }
    if (incremental) {
      this.reify()
    }
  }

  reify(): void {
    // apply scoped class id to class attribute
    reify(this)
  }

  render(file: string): { code: string; map: ReturnType<MagicStringAST['generateMap']> } {
    const code = new MagicStringAST(this.source)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore -- css-tree types are not up-to-date
    walkAST<CssNode>(this.ast, {
      enter(node) {
        code.addSourcemapLocation(node.start!)
        code.addSourcemapLocation(node.end!)
      }
    })
    const max = Math.max(...this.children.map(css => getMaxAmountClassSpecificityIncreased(css)))

    for (const child of this.children) {
      transform(child, code, this.id, this.keyframes, max)
    }

    let c = 0
    for (const child of this.children) {
      if (isUsed(child, this.dev)) {
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
        source: this.filename,
        file
      })
    }
  }

  warnOnUnusedSelectors(): void {
    for (const child of this.children) {
      warnOnUnusedSelectors(child, selector => {
        console.warn(`Unused CSS selector "${JSON.stringify(selector.node)}"`)
      })
    }
  }
}

function warnOnUnusedSelectors(
  css: Rule | Atrule | Selector,
  cb: (selector: Selector) => void
): void {
  if (css instanceof Rule) {
    // for Rule
    for (const selector of css.selectors) {
      if (!selector.used) {
        cb(selector)
      }
    }
  } else if (css instanceof Atrule) {
    // for Atrule
    if (css.node.name !== 'media') {
      return
    }
    for (const child of css.children) {
      warnOnUnusedSelectors(child, cb)
    }
  } else if (css instanceof Selector) {
    throw new TypeError('Invalid css type')
  } else {
    throw new TypeError('Invalid css type')
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
    // for (const selector of css.selectors) {
    //   apply(node, selector, stylesheet)
    // }
    css.selectors.forEach(selector => {
      apply(node, selector, stylesheet)
    })
  } else if (css instanceof Atrule) {
    // for Atrule
    if (
      css.node.name === 'container' ||
      css.node.name === 'media' ||
      css.node.name === 'supports' ||
      css.node.name === 'layer'
    ) {
      // for (const child of css.children) {
      //   apply(node, child, stylesheet)
      // }
      css.children.forEach(child => {
        apply(node, child, stylesheet)
      })
    } else if (isKeyFramesNode(css.node)) {
      // for (const rule of css.children) {
      //   if (rule instanceof Rule) {
      //     for (const selector of rule.selectors) {
      //       selector.used = true
      //     }
      //   }
      // }
      css.children.forEach(rule => {
        if (rule instanceof Rule) {
          rule.selectors.forEach(selector => {
            selector.used = true
          })
        }
      })
    }
  } else if (css instanceof Selector) {
    // for Selector
    const toEncapsulate: { node: SvelteElement; block: Block }[] = []

    // console.log('css.localBlocks', JSON.stringify(css.localBlocks), css.localBlocks.length)
    // eslint-disable-next-line unicorn/prefer-spread
    applySelector(css.localBlocks.slice(), node, toEncapsulate)

    if (toEncapsulate.length > 0) {
      // for (const { node: templateNode, block } of toEncapsulate) {
      //   stylesheet.nodesWithCssClass.add(templateNode)
      //   block.shouldEncapsulate = true
      // }
      toEncapsulate.forEach(({ node: templateNode, block }) => {
        stylesheet.nodesWithCssClass.add(templateNode)
        block.shouldEncapsulate = true
      })
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
  for (const node of stylesheet.nodesWithCssClass) {
    // ignore if the node already has reified
    if (stylesheet.applyCssWithNode.has(node)) {
      continue
    }

    if (node.attributes.some(attr => isSvelteSpreadAttribute(attr))) {
      // this.needs_manual_style_scoping = true
      continue
    }

    const { id } = stylesheet
    const classAttribute = node.attributes.find(attr => attr.name === 'class')
    if (classAttribute && !(classAttribute.value === true)) {
      const chunks = createAttributeChunks(classAttribute)
      if (chunks.length === 1 && isSvelteText(chunks[0])) {
        chunks[0].data += ` ${id}`
        stylesheet.applyCssWithNode.add(node)
      } else {
        if (Array.isArray(classAttribute.value)) {
          classAttribute.value.push({
            type: 'Text',
            raw: ` ${id}`,
            data: ` ${id}`
          })
          stylesheet.applyCssWithNode.add(node)
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
      stylesheet.applyCssWithNode.add(node)
    }
  }
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
  if (!hasChildren(selector)) {
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

const RE_WHITESPACE = /\s/
const RE_ONLY_WHITESPACES = /^[\t\n\f\r ]+$/

function minify(
  css: Rule | Atrule | Selector | Declaration,
  code: MagicStringAST,
  dev: boolean
): void {
  if (css instanceof Rule) {
    // for Rule
    let c = css.node.start!
    let started = false
    for (const selector of css.selectors) {
      if (selector.used) {
        const separator = started ? ',' : ''
        if (selector.node.start! - c > separator.length) {
          code.update(c, selector.node.start!, separator)
        }
        minify(selector, code, dev)
        c = selector.node.end!
        started = true
      }
    }
    code.remove(c, css.node.block.start!)
    c = css.node.block.start! + 1
    c = minifyDeclarations(code, c, css.declarations, dev)
    code.remove(c, css.node.block.end! - 1)
  } else if (css instanceof Atrule) {
    // for Atrule
    if (css.node.name === 'media') {
      if (css.node.prelude) {
        const expressionChar = code.original[css.node.prelude.start!]
        let c = css.node.start! + (expressionChar === '(' ? 6 : 7)
        if (css.node.prelude.start! > c) {
          code.remove(c, css.node.prelude.start!)
        }
        if (hasChildren(css.node.prelude)) {
          // TODO: minify queries
          css.node.prelude.children.forEach(query => (c = query.end!))
        }
        code.remove(c, css.node.block!.start!)
      }
    } else if (css.node.name === 'supports') {
      let c = css.node.start! + 9
      if (css.node.prelude) {
        if (css.node.prelude.start! - c > 1) {
          code.update(c, css.node.prelude.start!, ' ')
        }
        if (hasChildren(css.node.prelude)) {
          // TODO: minify queries
          css.node.prelude.children.forEach(query => (c = query.end!))
        }
      }
      code.remove(c, css.node.block!.start!)
    } else {
      let c = css.node.start! + css.node.name.length + 1
      if (css.node.prelude) {
        if (css.node.prelude.start! - c > 1) {
          code.update(c, css.node.prelude.start!, ' ')
        }
        c = css.node.prelude.end!
      }
      if (css.node.block && css.node.block.start! - c > 0) {
        code.remove(c, css.node.block.start!)
      }
    }

    if (css.node.block) {
      let c = css.node.block.start! + 1
      if (css.declarations.length > 0) {
        c = minifyDeclarations(code, c, css.declarations, dev)
        // if the atrule has children, leave the last declaration semicolon alone
        if (css.children.length > 0) {
          c++
        }
      }
      for (const child of css.children) {
        if (isUsed(child, dev)) {
          code.remove(c, child.node.start!)
          minify(child, code, dev)
          c = child.node.end!
        }
      }
      code.remove(c, css.node.block.end! - 1)
    }
  } else if (css instanceof Selector) {
    // for Selector
    let c: number | null = null // eslint-disable-line unicorn/no-null
    css.blocks.forEach((block, i) => {
      if (i > 0 && block.start! - c! > 1) {
        // prettier-ignore
        const v = block.combinator == null // eslint-disable-line unicorn/no-null
          ? ' '
          : isCombinator(block.combinator)
            ? block.combinator.name
            : isWhiteSpace(block.combinator)
              ? block.combinator.value
              : ' '
        code.update(c!, block.start!, v)
      }
      c = block.end
    })
  } else if (css instanceof Declaration) {
    // for Declaration
    if (!css.node.property) {
      // @apply, and possibly other weird cases?
      return
    }
    const c = css.node.start! + css.node.property.length
    const first = hasChildren(css.node.value)
      ? (css.node.value.children as unknown as CssNode[])[0]
      : css.node.value
    // Don't minify whitespace in custom properties, since some browsers (Chromium < 99)
    // treat --foo: ; and --foo:; differently
    if (first.type === 'Raw' && RE_ONLY_WHITESPACES.test(first.value)) {
      return
    }
    let start = first.start!
    while (RE_WHITESPACE.test(code.original[start])) {
      start += 1
    }
    if (start - c > 1) {
      code.update(c, start, ':')
    }
  } else {
    throw new TypeError('Invalid css type')
  }
}

function minifyDeclarations(
  code: MagicStringAST,
  start: number,
  declarations: Declaration[],
  dev: boolean
): number {
  let c = start
  declarations.forEach((declaration, i) => {
    const separator = i > 0 ? ';' : ''
    if (declaration.node.start! - c > separator.length) {
      code.update(c, declaration.node.start!, separator)
    }
    minify(declaration, code, dev)
    c = declaration.node.end!
  })
  return c
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
