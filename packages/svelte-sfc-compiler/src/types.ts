// SPDX-License-Identifier: MIT
// Modifier: kazuya kawaguchi (a.k.a. kazupon)

import type {
  SFCAsyncStyleCompileOptions,
  SFCBlock,
  SFCDescriptor,
  SFCParseOptions,
  SFCParseResult,
  SFCScriptBlock,
  SFCScriptCompileOptions,
  SFCStyleBlock,
  SFCStyleCompileOptions,
  SFCStyleCompileResults,
  SFCTemplateBlock,
  SFCTemplateCompileOptions,
  SFCTemplateCompileResults
} from '@vue-vapor/compiler-sfc'
import type {
  CompilerOptions,
  Overwrite,
  SvelteStyle,
  SvelteTemplateNode
} from 'svelte-vapor-template-compiler'
import type { CompileOptions as SvelteCompileOptions } from 'svelte/compiler'

export type { CompilerError, SFCDescriptor } from '@vue-vapor/compiler-sfc'

export interface SvelteTemplateCompiler {
  compile: typeof import('svelte-vapor-template-compiler').compile
  parse: typeof import('svelte/compiler').parse
}

export type SvelteParseOptions = Overwrite<
  SFCParseOptions,
  {
    compiler?: SvelteTemplateCompiler
    templateParseOptions?: SvelteCompileOptions
  }
>

export type SvelteSFCParseResult = Overwrite<
  SFCParseResult,
  {
    descriptor: SvelteSFCDescriptor
  }
>

export type SvelteSFCTemplateCompileOptions = Overwrite<
  SFCTemplateCompileOptions,
  {
    ast?: SvelteTemplateNode
    compiler?: SvelteTemplateCompiler
    compilerOptions?: CompilerOptions
  }
>

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SvelteSFCTemplateCompileResults extends SFCTemplateCompileResults {}

export type SvelteSFCScriptCompileOptions = Overwrite<
  SFCScriptCompileOptions,
  {
    templateOptions?: Partial<SvelteSFCTemplateCompileOptions>
  }
>

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SvelteSFCStyleCompileResults extends SFCStyleCompileResults {}

export interface SvelteSFCStyleCompileOptions extends SFCStyleCompileOptions {
  ast: SvelteStyle
  sourceAll: string
  templateAst: SvelteTemplateNode
}

export interface SvelteSFCAsyncStyleCompileOptions extends SFCAsyncStyleCompileOptions {
  ast: SvelteStyle
  sourceAll: string
  templateAst: SvelteTemplateNode
}

export type SvelteSFCTemplateBlock = Overwrite<
  SFCTemplateBlock,
  {
    ast: SvelteTemplateNode
  }
>

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SvelteSFCBlock extends SFCBlock {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SvelteSFCScriptBlock extends SFCScriptBlock {}

export interface SvelteSFCStyleBlock extends SFCStyleBlock {
  ast: SvelteStyle
  source: string
}

declare module '@vue-vapor/compiler-sfc' {
  export interface SFCDescriptor {
    id?: string
  }
}

export type SvelteSFCDescriptor = Overwrite<
  SFCDescriptor,
  {
    template: SvelteSFCTemplateBlock | null
    scriptSetup?: SvelteSFCScriptBlock | null
  }
> & {
  module: SvelteSFCScriptBlock | null
}
