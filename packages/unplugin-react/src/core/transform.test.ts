import { test, expect } from 'vitest'
import { transform } from './transform.ts'

import type { ResolvedOptions } from './types.ts'

test('basic', () => {
  const source = `import { useState } from 'react'
export default function App() {
  const [count, setCount] = useState(0)
  return (<button onClick={() => setCount(count + 1)}>count is {count}</button>)
}
`
  const ret = transform(source, 'test.tsx', {} as ResolvedOptions)
  expect(ret?.code).toMatchSnapshot()
})
