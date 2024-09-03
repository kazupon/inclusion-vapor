import { describe, expect, test } from 'vitest'
import { transformComponent, transformReactivity } from './transform.ts'

import type { ResolvedOptions } from './types.ts'

describe('transformComponent', () => {
  test('function: export default', () => {
    const source = `import { useState } from 'react'
export default function App() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>count is {count}</button>
}
`
    const ret = transformComponent(source, 'test.tsx', {} as ResolvedOptions)
    expect(ret?.code).toMatchSnapshot()
  })

  test('function: export default via identifier', () => {
    const source = `import { useState } from 'react'
function App() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>count is {count}</button>
}
export default App
`
    const ret = transformComponent(source, 'test.tsx', {} as ResolvedOptions)
    expect(ret?.code).toMatchSnapshot()
  })
})

describe('transformReactivity', () => {
  test('useState', () => {
    const source = `import { useState } from 'react'
export default function App() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>count is {count}</button>
}
`
    const component = transformComponent(source, 'test.tsx', {} as ResolvedOptions)
    const ret = transformReactivity(component!.code, 'test.tsx', {} as ResolvedOptions)
    expect(ret?.code).toMatchSnapshot()
  })
})
