import { createRoot } from 'react-dom/client'
import ComponentPreviewer from './components/ComponentPreviewer'
import './styles/tailwind.css'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ComponentPreviewer />
    </div>
  )
}

const domNode = document.getElementById('root')!
const root = createRoot(domNode)
root.render(<App />)
