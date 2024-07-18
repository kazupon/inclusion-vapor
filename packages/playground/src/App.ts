import { createTextNode as _createTextNode, defineComponent } from 'vue/vapor' // eslint-disable-line unicorn/filename-case

import type { Component } from 'vue/vapor'

// @ts-expect-error -- IGORE
function render(_ctx) {
  const n0 = _createTextNode(['hello world'])
  return n0
}

const App: Component = defineComponent({ render })

export default App
