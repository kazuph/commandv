import { createRoot } from 'react-dom/client'
import ComponentPreviewer from './components/ComponentPreviewer'
import './styles/reset.css'
import './styles/custom.css' // カスタムCSSの読み込み

function App() {
  return (
    <div className="min-h-screen bg-white w-full max-w-full p-0 m-0">
      <ComponentPreviewer />
    </div>
  )
}

// Load html2canvas for image download functionality
const loadDependencies = () => {
  const script = document.createElement('script');
  script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
  script.async = true;
  document.body.appendChild(script);
};

const domNode = document.getElementById('root')!
const root = createRoot(domNode)
root.render(<App />)

// Load dependencies
loadDependencies();
