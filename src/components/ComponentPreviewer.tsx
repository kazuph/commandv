import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';

// highlight.jsとESBuildを使うためのWindow拡張インターフェース
declare global {
  interface Window {
    hljs?: {
      highlightAll: () => void;
    };
    esbuild?: {
      transform: (code: string, options: any) => Promise<{
        code: string;
        map: string;
        warnings: any[];
      }>;
      initialize: (options: any) => Promise<void>;
    };
  }
}

import * as htmlToImage from 'html-to-image';
// グラフライブラリなど
import * as recharts from 'recharts';
import _ from 'lodash';
import Papa from 'papaparse';
// 必要なアイコンのみをインポート
import { FaGithub, FaCode } from 'react-icons/fa';
import { MdFileDownload } from 'react-icons/md';

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
  
  // For PNG, use html-to-image which has better gradient support
  const captureElement = async () => {
    try {
      // Apply temporary background style if needed
      const originalBackgroundColor = element.style.backgroundColor;
      if (!originalBackgroundColor || originalBackgroundColor === 'transparent') {
        element.style.backgroundColor = '#FFFFFF';
      }
      
      // Set dimensions
      const rect = element.getBoundingClientRect();
      
      // Use html-to-image for better gradient support
      const dataUrl = await htmlToImage.toPng(element, {
        backgroundColor: '#FFFFFF',
        pixelRatio: 2, // Higher resolution
        quality: 1.0,
        skipFonts: false, // Include fonts for better text rendering
        canvasWidth: rect.width * 2,
        canvasHeight: rect.height * 2,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });
      
      // Create download link
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${fileName}.png`;
      link.click();
      
      // Restore original background
      element.style.backgroundColor = originalBackgroundColor;
    } catch (err) {
      console.error('Failed to capture element:', err);
    }
  };
  
  captureElement();
};

// Add syntax highlighter script and ESBuild to head
const addScriptsToHead = () => {
  // ESBuildを追加
  const esbuildScript = document.createElement('script');
  esbuildScript.src = 'https://unpkg.com/esbuild-wasm@0.14.54/lib/browser.min.js';
  esbuildScript.async = true;
  
  // ESBuildスクリプトの読み込み完了後に初期化を実行
  esbuildScript.onload = () => {
    // ESBuildの初期化
    if (window.esbuild) {
      window.esbuild.initialize({
        wasmURL: 'https://unpkg.com/esbuild-wasm@0.14.54/esbuild.wasm'
      }).catch(e => {
        console.error('Failed to initialize esbuild:', e);
      });
    }
  };

  document.head.appendChild(esbuildScript);
};

// Safe component execution function
const compileJSX = async (code: string): Promise<React.ComponentType> => {
  try {
    // ESBuildを使用してJSXをトランスフォーム（Babelの代わり）
    if (!window.esbuild) {
      throw new Error('ESBuild not loaded. Please try again in a moment.');
    }
    
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
      // React Icons（必要なものだけを追加）
      FaGithub,
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

    // Transform JSX with ESBuild instead of Babel (much smaller bundle size)
    let transformedCode;
    try {
      const result = await window.esbuild?.transform(strippedCode, {
        loader: 'jsx',
        jsxFactory: 'React.createElement',
        jsxFragment: 'React.Fragment',
        target: 'es2015'
      });

      if (!result || !result.code) {
        throw new Error('Failed to transform JSX');
      }

      transformedCode = result.code;
    } catch (transformError: unknown) {
      console.error('ESBuild transformation error:', transformError);
      const errorMessage = transformError instanceof Error ? transformError.message : 'Unknown transformation error';
      throw new Error(`Couldn't transform the code: ${errorMessage}`);
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

const ComponentPreviewer: React.FC = () => {
  const [code, setCode] = useState<string>('');
  const [component, setComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState<boolean>(false); // Default to closed
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
  };

  // Handle clipboard paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Allow paste in inputs and text areas
      const activeElement = document.activeElement;
      const isEditorActive = 
        activeElement?.tagName === 'INPUT' || 
        activeElement?.tagName === 'TEXTAREA' || 
        activeElement?.getAttribute('role') === 'textbox';
        
      if (!isEditorActive) {
        e.preventDefault();
        const pastedCode = e.clipboardData?.getData('text') || '';
        setCode(pastedCode);
        compileAndSetComponent(pastedCode);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  // Compile code and set component
  const compileAndSetComponent = async (codeToCompile: string) => {
    try {
      const CompiledComponent = await compileJSX(codeToCompile);
      setComponent(() => CompiledComponent);
      setError(null);
    } catch (err) {
      setComponent(() => SampleCounter);
      setError(`Compilation error: ${(err as Error).message}`);
    }
  };

  // Load ESBuild when component mounts
  useEffect(() => {
    addScriptsToHead();
  }, []);

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
      
      // Capture the element with html-to-image for better gradient support
      htmlToImage.toPng(element, {
        backgroundColor: styles.backgroundColor || '#f9fafb',
        pixelRatio: 2, // Higher resolution
        quality: 1.0,
        skipFonts: false, // Include fonts for better text rendering
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      }).then((dataUrl: string) => {
        // Create download link
        const link = document.createElement('a');
        link.download = 'commandv-component.png';
        link.href = dataUrl;
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
            className="p-2.5 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
            onClick={() => setShowCode(!showCode)}
            aria-label={showCode ? "Hide Code" : "Show Code"}
            title={showCode ? "Hide Code" : "Show Code"}
          >
            <FaCode size={20} />
          </button>
          
          <button
            className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-md hover:opacity-90 transition-opacity"
            onClick={handleDownloadPreview}
            aria-label="Save as Image"
            title="Save as Image"
          >
            <MdFileDownload size={20} />
          </button>
        </div>
      </header>
      
      {/* Main content */}
      <div className="flex flex-1 overflow-hidden" style={{ width: '100%', maxWidth: '100%' }}>
        {/* Code editor */}
        {showCode && (
          <div className="w-1/2 border-r border-gray-200 flex flex-col">
            <div className="flex-1 p-4 bg-gray-50" style={{ height: 'calc(80vh - 100px)' }}>
              {/* Monaco Editor */}
              <div className="border rounded-md overflow-hidden w-full h-full">
                <Editor
                  height="100%"
                  defaultLanguage="javascript"
                  theme="vs-dark"
                  value={code}
                  onChange={(value) => {
                    setCode(value || '');
                    if (value) {
                      compileAndSetComponent(value);
                    }
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: 'on',
                    automaticLayout: true
                  }}
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200">
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
            {error ? (
              <div className="bg-red-50 p-6 rounded-lg w-full max-w-2xl">
                <div className="text-red-500 whitespace-pre-wrap mb-4">
                  {error}
                </div>
                {component && React.createElement(component)}
              </div>
            ) : (
              component ? (
                <React.Suspense fallback={<div>Loading...</div>}>
                  <div className="w-full h-auto flex items-center justify-center" style={{ minHeight: 'auto' }}>
                    {React.createElement(component)}
                  </div>
                </React.Suspense>
              ) : (
                <WelcomeScreen onLoadSample={loadSample} />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComponentPreviewer;
