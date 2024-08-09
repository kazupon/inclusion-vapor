import type {
  SFCParseOptions,
  SFCParseResult,
  SFCDescriptor,
  SFCTemplateBlock,
  SFCTemplateCompileOptions,
  SFCTemplateCompileResults,
  SFCScriptCompileOptions,
  SFCScriptBlock,
  SFCStyleBlock,
  SFCBlock
} from '@vue-vapor/compiler-sfc'
import type { CompileOptions as SvelteCompileOptions } from 'svelte/compiler'
import type {
  Overwrite,
  SvelteTemplateNode,
  SvelteStyle,
  CompilerOptions
} from 'svelte-vapor-template-compiler'

export type { SFCDescriptor, CompilerError } from '@vue-vapor/compiler-sfc'

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

export type SvelteSFCTemplateBlock = Overwrite<
  SFCTemplateBlock,
  {
    ast?: SvelteTemplateNode
  }
>

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SvelteSFCBlock extends SFCBlock {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SvelteSFCScriptBlock extends SFCScriptBlock {}

export interface SvelteSFCStyleBlock extends SFCStyleBlock {
  ast?: SvelteStyle | null
}

declare module '@vue-vapor/compiler-sfc' {
  export interface SFCDescriptor {
    id?: string
  }
}

export type SvelteSFCDescriptor = Overwrite<
  SFCDescriptor,
  {
    template?: SvelteSFCTemplateBlock | null
    scriptSetup?: SvelteSFCScriptBlock | null
  }
>
