import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import html2canvas from 'html2canvas';
import * as Babel from '@babel/standalone';
import * as recharts from 'recharts';
import _ from 'lodash';
import Papa from 'papaparse';
// React Icons
import * as FaIcons from 'react-icons/fa';
import * as AiIcons from 'react-icons/ai';
import * as BiIcons from 'react-icons/bi';
import * as BsIcons from 'react-icons/bs';
import * as FiIcons from 'react-icons/fi';
import * as GoIcons from 'react-icons/go';
import * as GrIcons from 'react-icons/gr';
import * as HiIcons from 'react-icons/hi';
import * as ImIcons from 'react-icons/im';
import * as IoIcons from 'react-icons/io';
import * as IoIcons5 from 'react-icons/io5';
import * as MdIcons from 'react-icons/md';
import * as RiIcons from 'react-icons/ri';
import * as SiIcons from 'react-icons/si';
import * as TiIcons from 'react-icons/ti';
import * as VscIcons from 'react-icons/vsc';

import AppleLogo from './AppleLogo';
import WelcomeScreen from './WelcomeScreen';
import SampleCounter from './SampleCounter';

// Function to convert SVG to data URL for download
const svgToDataURL = (svgElement: SVGElement): string => {
  const svgString = new XMLSerializer().serializeToString(svgElement);
  const svg64 = btoa(unescape(encodeURIComponent(svgString)));
  return `data:image/svg+xml;base64,${svg64}`;
};

// Function to download element as image
const downloadElementAsImage = (element: HTMLElement, fileName: string, format: 'png' | 'svg' = 'png') => {
  if (format === 'svg') {
    if (element.querySelector('svg')) {
      const svg = element.querySelector('svg') as SVGElement;
      const svgDataUrl = svgToDataURL(svg);
      
      const link = document.createElement('a');
      link.href = svgDataUrl;
      link.download = `${fileName}.svg`;
      link.click();
    } else {
      console.error('No SVG element found for download');
    }
    return;
  }
  
  // For PNG, use DOM to canvas approach
  const captureElement = async () => {
    try {
      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }
      
      // Set dimensions
      const rect = element.getBoundingClientRect();
      canvas.width = rect.width * 2; // For better quality
      canvas.height = rect.height * 2;
      ctx.scale(2, 2);
      
      // Draw background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Convert element to image
      const data = `<svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}">
        <foreignObject width="100%" height="100%" x="0" y="0">
          <div xmlns="http://www.w3.org/1999/xhtml">
            ${element.outerHTML}
          </div>
        </foreignObject>
      </svg>`;
      
      const img = new Image();
      const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data);
      
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `${fileName}.png`;
        link.click();
      };
      
      img.onerror = (e) => {
        console.error('Image loading error:', e);
        // Fallback to SVG if PNG fails
        if (element.querySelector('svg')) {
          const svg = element.querySelector('svg') as SVGElement;
          const svgDataUrl = svgToDataURL(svg);
          
          const link = document.createElement('a');
          link.href = svgDataUrl;
          link.download = `${fileName}.svg`;
          link.click();
        }
      };
      
      img.src = dataUrl;
    } catch (err) {
      console.error('Failed to capture element:', err);
    }
  };
  
  captureElement();
};

// Safe component execution function
const compileJSX = (code: string): React.ComponentType => {
  try {
    // Add libraries to scope
    const scope: Record<string, any> = {
      React,
      useState,
      useEffect,
      useRef,
      useCallback: React.useCallback,
      useMemo: React.useMemo,
      useContext: React.useContext,
      useReducer: React.useReducer,
      // Libraries
      recharts,
      _,
      Papa,
      // React Icons
      ...FaIcons, ...AiIcons, ...BiIcons, ...BsIcons, 
      ...FiIcons, ...GoIcons, ...GrIcons, ...HiIcons, 
      ...ImIcons, ...IoIcons, ...IoIcons5, ...MdIcons,
      ...RiIcons, ...SiIcons, ...TiIcons, ...VscIcons,
    };

    // Strip import/export statements (more carefully)
    let strippedCode = code;
    
    // Remove imports
    strippedCode = strippedCode
      .replace(/import\s+.*?from\s+['"].*?['"]\s*;?/g, '')
      .replace(/import\s+{.*?}\s+from\s+['"].*?['"]\s*;?/g, '')
      .replace(/import\s+['"].*?['"]\s*;?/g, '');
    
    // Save any component name from default export for later use
    let defaultExportMatch = strippedCode.match(/export\s+default\s+([A-Z][A-Za-z0-9_]*)/);
    let defaultExportName = defaultExportMatch ? defaultExportMatch[1] : null;
    
    // Remove exports
    strippedCode = strippedCode
      .replace(/export\s+default\s+[A-Z][A-Za-z0-9_]*/g, '')
      .replace(/export\s+default\s+/g, '')
      .replace(/export\s+/g, '');

    // Component detection regex patterns (improved)
    const constComponentPattern = /const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*(?:\(|\s*=>|\s*function\s*\()/;
    const functionComponentPattern = /function\s+([A-Z][A-Za-z0-9_]*)\s*\(/;
    const classComponentPattern = /class\s+([A-Z][A-Za-z0-9_]*)\s+extends\s+(?:React\.)?Component/;

    // Detect component name
    let componentName: string | null = null;
    let match: RegExpExecArray | null;

    if ((match = constComponentPattern.exec(strippedCode)) !== null) {
      componentName = match[1];
    } else if ((match = functionComponentPattern.exec(strippedCode)) !== null) {
      componentName = match[1];
    } else if ((match = classComponentPattern.exec(strippedCode)) !== null) {
      componentName = match[1];
    }
    
    // Use the default export name if we found one earlier
    if (!componentName && defaultExportName) {
      componentName = defaultExportName;
    }

    // If component name not found, try additional detection methods
    if (!componentName) {
      // Look for common component names
      if (strippedCode.includes('const Component =') || 
          strippedCode.includes('function Component(') || 
          strippedCode.includes('class Component extends')) {
        componentName = 'Component';
      } else if (strippedCode.includes('const CounterApp =') || 
                 strippedCode.includes('function CounterApp(') || 
                 strippedCode.includes('class CounterApp extends')) {
        componentName = 'CounterApp';
      } else if (strippedCode.includes('const App =') || 
                 strippedCode.includes('function App(') || 
                 strippedCode.includes('class App extends')) {
        componentName = 'App';
      } else {
        // Look for any capitalized component-like expressions
        const anyComponentMatch = strippedCode.match(/const\s+([A-Z][A-Za-z0-9_]*)\s*=/);
        if (anyComponentMatch) {
          componentName = anyComponentMatch[1];
        } else {
          // Wrap in safe fallback component
          const wrappedCode = `
          const Component = () => { 
            return (
              <div className="text-red-500 p-4 border border-red-300 rounded">
                No component found. Please define a component with a capitalized name.
              </div>
            );
          };
          
          ${strippedCode}`;
          
          // Reassign
          componentName = 'Component';
          return compileJSX(wrappedCode);
        }
      }
    }

    // Log for debugging
    console.log('Detected component name:', componentName);

    // Transform JSX with Babel with better error handling
    let transformedCode;
    try {
      transformedCode = Babel.transform(strippedCode, {
        presets: ['react', 'env'],
        plugins: ['transform-modules-commonjs'],
        filename: 'component.jsx'
      }).code;

      // Tailwind CSSクラスを保持し、特定のクラスをインラインスタイルに変換するロジック
      transformedCode = transformedCode.replace(/className=["']([^"']*)["']/g, (match: string, p1: string) => {
        // もとのクラス名をログに出力（デバッグ用）
        console.log('Original className:', p1);
        
        // 水色系グラデーションを使っているか確認
        const hasCyanClasses = p1.includes('from-cyan-') || p1.includes('bg-cyan-') || p1.includes('text-cyan-');
        const hasBlueCyanGradient = p1.includes('bg-gradient') && 
                                 (p1.includes('from-cyan-') || p1.includes('to-cyan-'));
        
        // インラインスタイルを追加するかどうか
        let styleAttribute = '';
        if (hasCyanClasses) {
          // シアンの背景色
          if (p1.includes('bg-cyan-300')) styleAttribute = 'style={{backgroundColor: "#67e8f9"}}';
          else if (p1.includes('bg-cyan-400')) styleAttribute = 'style={{backgroundColor: "#22d3ee"}}';
          else if (p1.includes('bg-cyan-500')) styleAttribute = 'style={{backgroundColor: "#06b6d4"}}';
          else if (p1.includes('bg-cyan-600')) styleAttribute = 'style={{backgroundColor: "#0891b2"}}';
          
          // シアンのテキスト色
          else if (p1.includes('text-cyan-400')) styleAttribute = 'style={{color: "#22d3ee"}}';
          else if (p1.includes('text-cyan-500')) styleAttribute = 'style={{color: "#06b6d4"}}';
        }
        else if (hasBlueCyanGradient) {
          // グラデーション
          if (p1.includes('from-cyan-400')) {
            styleAttribute = 'style={{background: "linear-gradient(to bottom right, #22d3ee, var(--tw-gradient-to, #fff))"}}';
          }
          else if (p1.includes('to-cyan-400')) {
            styleAttribute = 'style={{background: "linear-gradient(to bottom right, var(--tw-gradient-from, #fff), #22d3ee)"}}';
          }
        }
        
        // スタイル属性が追加された場合、それを含めて返す
        if (styleAttribute) {
          return `className="${p1}" ${styleAttribute}`;
        }
        
        // スタイル属性がない場合は、クラス名をそのまま維持
        return `className="${p1}"`;
      });
      
      // グラデーション関連のクラスを特に注意深く保持する
      transformedCode = transformedCode.replace(/bg-gradient-to-br/g, 'bg-gradient-to-br');
      transformedCode = transformedCode.replace(/from-cyan-(\d+)/g, 'from-cyan-$1');
      transformedCode = transformedCode.replace(/to-cyan-(\d+)/g, 'to-cyan-$1');
      transformedCode = transformedCode.replace(/from-blue-(\d+)/g, 'from-blue-$1');
      transformedCode = transformedCode.replace(/to-indigo-(\d+)/g, 'to-indigo-$1');
    } catch (babelError: unknown) {
      console.error('Babel transformation error:', babelError);
      const errorMessage = babelError instanceof Error ? babelError.message : 'Unknown Babel error';
      throw new Error(`Babel couldn't transform the code: ${errorMessage}`);
    }

    // Create more robust executable component function
    const executableCode = `
      // Define module and exports
      const module = { exports: {} };
      const exports = module.exports;
      
      try {
        // Execute transformed code
        ${transformedCode}
        
        // First check if the component is available in the scope
        if (typeof ${componentName} === 'function') {
          return ${componentName};
        } 
        // Then check if it's defined on module.exports
        else if (module.exports && typeof module.exports === 'function') {
          return module.exports;
        }
        // Check if it's the default export
        else if (module.exports && module.exports.default && typeof module.exports.default === 'function') {
          return module.exports.default;
        }
        // Finally, try to return the named component
        else {
          return ${componentName};
        }
      } catch (e) {
        console.error('Runtime error in component code:', e);
        throw new Error('Error in component code: ' + e.message);
      }
    `;

    // Execute the code using Function constructor
    try {
      const factory = new Function(...Object.keys(scope), executableCode);
      const component = factory(...Object.values(scope));
      
      // Verify component is a function
      if (typeof component === 'function') {
        return component;
      } else {
        throw new Error('The returned object is not a React component');
      }
    } catch (evalError: unknown) {
      console.error('Component evaluation error:', evalError);
      const errorMessage = evalError instanceof Error ? evalError.message : 'Unknown error';
      throw new Error(`Failed to evaluate component: ${errorMessage}`);
    }
  } catch (error) {
    console.error('Compilation error:', error);
    return () => (
      <div className="p-4 bg-red-100 rounded">
        <h3 className="text-lg font-semibold text-red-600">Error</h3>
        <p className="whitespace-pre-wrap text-red-500">
          {(error as Error).message}
        </p>
      </div>
    );
  }
};

// テスト用のダミー要素（ビルド時にTailwindに検知させるため）
const TailwindClassesForDetection = () => (
  <div className="hidden">
    {/* 水色系クラスを明示的に含める */}
    <div className="from-cyan-400 from-cyan-500 from-blue-400 from-blue-500 from-blue-600"></div>
    <div className="to-blue-500 to-blue-600 to-indigo-500 to-indigo-600 to-cyan-400 to-cyan-500"></div>
    <div className="bg-gradient-to-br bg-gradient-to-r"></div>
    <div className="text-white"></div>
  </div>
);

const ComponentPreviewer: React.FC = () => {
  const [code, setCode] = useState<string>('');
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editorTheme, setEditorTheme] = useState<string>('vs-dark');
  const [showCode, setShowCode] = useState<boolean>(false); // Default to closed
  const [hasLoadedComponent, setHasLoadedComponent] = useState<boolean>(false);
  const editorRef = useRef<any>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Sample code for the counter app (Apple style)
  const sampleCode = `import { useState } from 'react';

const CounterApp = () => {
  const [count, setCount] = useState(0);
  
  // 水色グラデーション用のスタイル（バックアップ）
  const cyanGradientStyle = {
    background: 'linear-gradient(to bottom right, #22d3ee, #06b6d4)',
    color: 'white'
  };
  
  const blueGradientStyle = {
    background: 'linear-gradient(to bottom right, #3b82f6, #4f46e5)',
    color: 'white'
  };
  
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-md max-w-sm mx-auto">
      <h2 className="text-2xl font-light mb-8 tracking-tight">Counter</h2>
      
      <div className="bg-gray-50 w-full rounded-xl p-8 mb-8 shadow-inner">
        <div className="text-7xl font-light text-center">{count}</div>
      </div>
      
      <div className="flex justify-between w-full">
        <button 
          onClick={() => setCount(count - 1)}
          className="w-16 h-16 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xl font-light transition-colors shadow-sm"
          aria-label="Decrease"
        >
          -
        </button>
        
        <button 
          onClick={() => setCount(0)}
          className="px-6 py-2 rounded-full border border-gray-300 hover:bg-gray-100 text-sm transition-colors"
          aria-label="Reset"
        >
          Reset
        </button>
        
        <button 
          onClick={() => setCount(count + 1)}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white hover:opacity-90 flex items-center justify-center text-xl font-light transition-colors shadow-sm"
          style={blueGradientStyle}
          aria-label="Increase"
        >
          +
        </button>
      </div>
    </div>
  );
};

export default CounterApp;`;

  // Load sample code
  const loadSample = () => {
    setCode(sampleCode);
    compileAndSetComponent(sampleCode);
    setHasLoadedComponent(true);
  };

  // Handle clipboard paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Allow paste in inputs and text areas
      const activeElement = document.activeElement;
      const isEditorActive = 
        activeElement?.tagName === 'INPUT' || 
        activeElement?.tagName === 'TEXTAREA' || 
        activeElement?.getAttribute('role') === 'textbox' ||
        activeElement?.classList.contains('monaco-editor');
        
      if (!isEditorActive) {
        e.preventDefault();
        const pastedCode = e.clipboardData?.getData('text') || '';
        setCode(pastedCode);
        compileAndSetComponent(pastedCode);
        setHasLoadedComponent(true);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  // Compile code and set component
  const compileAndSetComponent = (codeToCompile: string) => {
    try {
      const CompiledComponent = compileJSX(codeToCompile);
      setComponent(() => CompiledComponent);
      setError(null);
    } catch (err) {
      setComponent(() => SampleCounter);
      setError(`Compilation error: ${(err as Error).message}`);
    }
  };

  // Editor setup
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  // Download preview as image with improved styling
  const handleDownloadPreview = () => {
    if (previewRef.current) {
      const element = previewRef.current;
      
      // First apply computed styles to ensure all styling is captured
      const styles = window.getComputedStyle(element);
      const originalElementStyle = element.getAttribute('style') || '';
      let additionalStyles = 'background-color: ' + styles.backgroundColor + '; ';
      additionalStyles += 'color: ' + styles.color + '; ';
      additionalStyles += 'padding: ' + styles.padding + '; ';
      
      // Apply the combined styles temporarily for the capture
      element.setAttribute('style', originalElementStyle + additionalStyles);
      
      // Capture the element
      html2canvas(element, {
        backgroundColor: styles.backgroundColor || '#f9fafb',
        logging: false,
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
      }).then((canvas: HTMLCanvasElement) => {
        // Create download link
        const link = document.createElement('a');
        link.download = 'commandv-component.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        // Restore original styling
        element.setAttribute('style', originalElementStyle);
      }).catch((err: Error) => {
        console.error('Failed to capture element:', err);
        // Restore original styling on error too
        element.setAttribute('style', originalElementStyle);
      });
    }
  };

  return (
    <div className="bg-white min-h-screen flex flex-col items-stretch" style={{ width: '100%', maxWidth: '100%', margin: 0, padding: 0 }}>
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-3 border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="flex items-center gap-2">
          <AppleLogo />
          <h1 className="text-2xl font-light">CommandV</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            className="px-3 py-1 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
            onClick={() => setShowCode(!showCode)}
          >
            {showCode ? "Hide Code" : "Show Code"}
          </button>
          
          <button
            className="px-4 py-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-md hover:opacity-90 transition-opacity text-sm"
            onClick={handleDownloadPreview}
            disabled={!hasLoadedComponent}
          >
            Save as Image
          </button>
        </div>
      </header>
      
      {/* Main content */}
      <div className="flex flex-1 overflow-hidden" style={{ width: '100%', maxWidth: '100%' }}>
        {/* Code editor */}
        {showCode && (
          <div className="w-1/2 border-r border-gray-200 flex flex-col">
            <div className="flex-1 p-4 bg-gray-50" style={{ height: 'calc(80vh - 100px)' }}>
              <Editor
                height="100%"
                defaultLanguage="javascript"
                value={code}
                onChange={(value) => setCode(value || '')}
                onMount={handleEditorDidMount}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  tabSize: 2,
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  formatOnPaste: true,
                  renderLineHighlight: 'all',
                  fontLigatures: true,
                  folding: true,
                  automaticLayout: true,
                  lineDecorationsWidth: 10,
                  colorDecorators: true,
                  bracketPairColorization: { enabled: true },
                  parameterHints: { enabled: true },
                  suggestOnTriggerCharacters: true,
                  snippetSuggestions: 'inline',
                  codeLens: true
                }}
                theme={editorTheme}
              />
            </div>
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center justify-end mb-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="theme-select" className="text-sm text-gray-600">Theme:</label>
                  <select 
                    id="theme-select"
                    className="text-sm border rounded-md p-1"
                    value={editorTheme}
                    onChange={(e) => setEditorTheme(e.target.value)}
                  >
                    <option value="vs">Light</option>
                    <option value="vs-dark">Dark</option>
                    <option value="hc-black">High Contrast</option>
                  </select>
                </div>
              </div>
              <button 
                className="w-full py-2 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-opacity"
                onClick={() => compileAndSetComponent(code)}
              >
                Run Code
              </button>
            </div>
          </div>
        )}
        
        {/* Preview */}
        <div className={`${showCode ? 'w-1/2' : 'w-full'} flex flex-col overflow-hidden`}>
          <div 
            ref={previewRef} 
            className="flex-1 flex items-start justify-center p-8 pt-12 overflow-auto bg-gray-50"
            style={{ height: 'calc(80vh - 100px)' }}
          >
            {!hasLoadedComponent ? (
              <WelcomeScreen onLoadSample={loadSample} />
            ) : error ? (
              <div className="bg-red-50 p-6 rounded-lg w-full max-w-2xl">
                <div className="text-red-500 whitespace-pre-wrap mb-4">
                  {error}
                </div>
                {Component && <Component />}
              </div>
            ) : Component ? (
              <React.Suspense fallback={<div>Loading...</div>}>
                <Component />
              </React.Suspense>
            ) : (
              <div className="text-gray-400 text-center">
                Paste component code to preview
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComponentPreviewer;
