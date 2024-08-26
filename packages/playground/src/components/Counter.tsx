import { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)
  return (
    <div className="card">
      <button onClick={() => setCount(count + 1)}>React Vapor count is {count}</button>
    </div>
  )
}

export default Counter
