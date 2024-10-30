import { useState } from 'react'

function Counter(): JSX.Element {
  const [count, setCount] = useState(0)
  return (
    <div id="react">
      <button onClick={() => setCount(count + 1)}>React Vapor count is {count}</button>
      <br />
      <span>This is a React component</span>
    </div>
  )
}
export default Counter
