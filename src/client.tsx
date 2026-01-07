import { createRoot } from 'react-dom/client'
import ComponentPreviewer from './components/ComponentPreviewer'
import './styles/reset.css'
import './styles/custom.css' // カスタムCSSの読み込み

function App() {
  return (
    <main className="min-h-screen bg-white w-full max-w-full p-0 m-0">
      <ComponentPreviewer />
    </main>
  )
}

const domNode = document.getElementById('root')!
const root = createRoot(domNode)
root.render(<App />)
