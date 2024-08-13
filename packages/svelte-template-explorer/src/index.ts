import { compile } from 'svelte-vapor-template-compiler'
import { toRaw, watchEffect } from 'vue'
import { SourceMapConsumer } from 'source-map-js'
import { compilerOptions, defaultOptions, initOptions, ssrMode } from './options'
import theme from './theme'

import type * as m from 'monaco-editor'
import type { CompilerOptions, VaporCompilerError } from 'svelte-vapor-template-compiler'

declare global {
  interface Window {
    monaco: typeof m
    _deps: any // eslint-disable-line @typescript-eslint/no-explicit-any
    init: () => void
  }
}

interface PersistedState {
  src: string
  ssr: boolean
  options: CompilerOptions
}

const sharedEditorOptions: m.editor.IStandaloneEditorConstructionOptions = {
  fontSize: 14,
  scrollBeyondLastLine: false,
  renderWhitespace: 'selection',
  minimap: {
    enabled: false
  }
}

window.init = () => {
  const monaco = window.monaco

  // @ts-expect-error -- IGNORE
  monaco.editor.defineTheme('my-theme', theme)
  monaco.editor.setTheme('my-theme')

  let persistedState: PersistedState | undefined

  try {
    let hash = window.location.hash.slice(1)
    try {
      hash = escape(atob(hash))
    } catch {} // eslint-disable-line no-empty
    persistedState = JSON.parse(
      decodeURIComponent(hash) || localStorage.getItem('state') || `{}`
    ) as PersistedState
  } catch (error: unknown) {
    // bad stored state, clear it
    console.warn(
      'Persisted state in localStorage seems to be corrupted, please reload.\n' +
        (error as Error).message
    )
    localStorage.clear()
  }

  if (persistedState) {
    // functions are not persistable, so delete it in case we sometimes need
    // to debug with custom nodeTransforms
    delete persistedState.options?.nodeTransforms
    ssrMode.value = persistedState.ssr
    Object.assign(compilerOptions, persistedState.options)
  }

  let lastSuccessfulCode: string
  let lastSuccessfulMap: SourceMapConsumer | undefined
  function compileCode(source: string): string {
    console.clear()
    try {
      const errors: VaporCompilerError[] = []
      const compileFn = compile
      const start = performance.now()
      const { code, ast, map } = compileFn(source, {
        ...compilerOptions,
        prefixIdentifiers:
          compilerOptions.prefixIdentifiers ||
          compilerOptions.mode === 'module' ||
          compilerOptions.ssr,
        filename: 'ExampleTemplate.svelte',
        sourceMap: true,
        onError: err => {
          errors.push(err as VaporCompilerError)
        }
      })
      console.log(`Compiled in ${(performance.now() - start).toFixed(2)}ms.`)
      monaco.editor.setModelMarkers(
        editor.getModel()!,
        `svelte-vapor-compiler`,
        // `@vue/compiler-dom`,
        errors.filter(e => e.loc).map(formatError) // eslint-disable-line unicorn/no-array-callback-reference
      )
      console.log(`AST(IR):`, ast)

      console.log(`Options:`, toRaw(compilerOptions))
      lastSuccessfulCode = code + `\n\n// Check the console for the AST(IR)`
      if (map) {
        lastSuccessfulMap = new SourceMapConsumer(map)
        lastSuccessfulMap.computeColumnSpans()
      }
    } catch (error: unknown) {
      lastSuccessfulCode = `/* ERROR: ${(error as Error).message} (see console for more info) */`
      console.error(error)
    }
    return lastSuccessfulCode
  }

  function formatError(err: VaporCompilerError) {
    const loc = err.loc!
    return {
      severity: monaco.MarkerSeverity.Error,
      startLineNumber: loc.start.line,
      startColumn: loc.start.column,
      endLineNumber: loc.end.line,
      endColumn: loc.end.column,
      message: `Svelte Vapor template compilation error: ${err.message}`,
      code: String(err.code)
    }
  }

  function reCompile() {
    const src = editor.getValue()
    // every time we re-compile, persist current state

    const optionsToSave = {}
    let key: keyof CompilerOptions
    for (key in compilerOptions) {
      const val = compilerOptions[key]
      if (typeof val !== 'object' && val !== defaultOptions[key]) {
        // @ts-expect-error -- FIXME
        optionsToSave[key] = val
      }
    }

    const state = JSON.stringify({
      src,
      ssr: ssrMode.value,
      options: optionsToSave
    } as PersistedState)
    localStorage.setItem('state', state)
    window.location.hash = btoa(unescape(encodeURIComponent(state)))
    const res = compileCode(src)
    if (res) {
      output.setValue(res)
    }
  }

  const editor = monaco.editor.create(document.querySelector('#source')!, {
    value: persistedState?.src || `<div>Hello World</div>`,
    language: 'html',
    ...sharedEditorOptions,
    wordWrap: 'bounded'
  })

  editor.getModel()!.updateOptions({
    tabSize: 2
  })

  const output = monaco.editor.create(document.querySelector('#output')!, {
    value: '',
    language: 'javascript',
    readOnly: true,
    ...sharedEditorOptions
  })
  output.getModel()!.updateOptions({
    tabSize: 2
  })

  // handle resize
  window.addEventListener('resize', () => {
    editor.layout()
    output.layout()
  })

  // update compile output when input changes
  editor.onDidChangeModelContent(debounce(reCompile))

  // highlight output code
  let prevOutputDecos: string[] = []
  function clearOutputDecos() {
    prevOutputDecos = output.deltaDecorations(prevOutputDecos, [])
  }

  editor.onDidChangeCursorPosition(
    debounce(e => {
      clearEditorDecos()
      if (lastSuccessfulMap) {
        const pos = lastSuccessfulMap.generatedPositionFor({
          source: 'ExampleTemplate.svelte',
          line: e.position.lineNumber,
          column: e.position.column - 1
        })
        if (pos.line != undefined && pos.column != undefined) {
          prevOutputDecos = output.deltaDecorations(prevOutputDecos, [
            {
              range: new monaco.Range(
                pos.line,
                pos.column + 1,
                pos.line,
                pos.lastColumn ? pos.lastColumn + 2 : pos.column + 2
              ),
              options: {
                inlineClassName: `highlight`
              }
            }
          ])
          output.revealPositionInCenter({
            lineNumber: pos.line,
            column: pos.column + 1
          })
        } else {
          clearOutputDecos()
        }
      }
    }, 100)
  )

  let previousEditorDecos: string[] = []
  function clearEditorDecos() {
    previousEditorDecos = editor.deltaDecorations(previousEditorDecos, [])
  }

  output.onDidChangeCursorPosition(
    debounce(e => {
      clearOutputDecos()
      if (lastSuccessfulMap) {
        const pos = lastSuccessfulMap.originalPositionFor({
          line: e.position.lineNumber,
          column: e.position.column - 1
        })
        if (
          pos.line != undefined &&
          pos.column != undefined &&
          !(
            // ignore mock location
            (pos.line === 1 && pos.column === 0)
          )
        ) {
          const translatedPos = {
            column: pos.column + 1,
            lineNumber: pos.line
          }
          previousEditorDecos = editor.deltaDecorations(previousEditorDecos, [
            {
              range: new monaco.Range(pos.line, pos.column + 1, pos.line, pos.column + 1),
              options: {
                isWholeLine: true,
                className: `highlight`
              }
            }
          ])
          editor.revealPositionInCenter(translatedPos)
        } else {
          clearEditorDecos()
        }
      }
    }, 100)
  )

  initOptions()
  watchEffect(reCompile)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number = 300): T {
  let prevTimer: number | null = null // eslint-disable-line unicorn/no-null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((...args: any[]) => {
    if (prevTimer) {
      clearTimeout(prevTimer)
    }
    prevTimer = window.setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      fn(...args)
      prevTimer = null // eslint-disable-line unicorn/no-null
    }, delay)
  }) as T
}
