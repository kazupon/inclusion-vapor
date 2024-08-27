import { useState } from 'react'

function Counter(): JSX.Element {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>React Vapor count is {count}</button>
}
export default Counter
