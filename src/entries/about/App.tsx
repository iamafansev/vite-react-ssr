import { useState } from 'react'

import '../../index.css'
import './App.css'

export function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <h1>About page</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </div>
    </div>
  )
}
