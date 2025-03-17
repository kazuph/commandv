import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@monaco-editor/react';
import * as Babel from '@babel/standalone';
import * as recharts from 'recharts';
import * as d3 from 'd3';
// @ts-ignore
import * as Chart from 'chart.js';
// @ts-ignore
import * as Plotly from 'plotly.js-dist';
import * as math from 'mathjs';
import _ from 'lodash';
// @ts-ignore
import * as Tone from 'tone';
import * as THREE from 'three';
import Papa from 'papaparse';
// React Icons (一部の主要なアイコンセットをインポート)
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

// シンプルなカウンターコンポーネント（デフォルト表示用）
const CounterDemo = () => {
  const [count, setCount] = useState(0);
  
  return (
    <div className="p-5 text-center">
      <h3 className="text-xl font-bold mb-3">シンプルカウンター</h3>
      <p className="mb-4">カウント: {count}</p>
      <div className="flex justify-center gap-2">
        <button
          onClick={() => setCount(count + 1)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
        >
          増加
        </button>
        <button
          onClick={() => setCount(count - 1)}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-700"
        >
          減少
        </button>
      </div>
    </div>
  );
};

// 安全なコンポーネント実行のための関数
const compileJSX = (code: string): React.ComponentType => {
  try {
    // ライブラリをスコープに入れる
    const scope: Record<string, any> = {
      React,
      useState,
      useEffect,
      useRef,
      useCallback: React.useCallback,
      useMemo: React.useMemo,
      useContext: React.useContext,
      useReducer: React.useReducer,
      // ライブラリ
      recharts,
      d3,
      Chart,
      Plotly,
      math,
      _,
      Tone,
      THREE,
      Papa,
      // React Icons
      ...FaIcons, ...AiIcons, ...BiIcons, ...BsIcons, 
      ...FiIcons, ...GoIcons, ...GrIcons, ...HiIcons, 
      ...ImIcons, ...IoIcons, ...IoIcons5, ...MdIcons,
      ...RiIcons, ...SiIcons, ...TiIcons, ...VscIcons,
    };

    // まず、import/export文を削除
    const strippedCode = code
      .replace(/import\s+.*?from\s+['"].*?['"]/g, '')
      .replace(/import\s+{.*?}\s+from\s+['"].*?['"]/g, '')
      .replace(/import\s+['"].*?['"]/g, '')
      .replace(/export\s+default\s+/, '')
      .replace(/export\s+/, '');

    // コンポーネント検出のための正規表現パターン
    const constComponentPattern = /const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*(\(|\s*=>)/;
    const functionComponentPattern = /function\s+([A-Z][A-Za-z0-9_]*)\s*\(/;
    const classComponentPattern = /class\s+([A-Z][A-Za-z0-9_]*)\s+extends\s+React\.Component/;

    // コンポーネント名を検出
    let componentName: string | null = null;
    let match: RegExpExecArray | null;

    if ((match = constComponentPattern.exec(strippedCode)) !== null) {
      componentName = match[1];
    } else if ((match = functionComponentPattern.exec(strippedCode)) !== null) {
      componentName = match[1];
    } else if ((match = classComponentPattern.exec(strippedCode)) !== null) {
      componentName = match[1];
    }

    // コンポーネント名が見つからない場合は、exportされたコンポーネント名を使用する
    if (!componentName && exportedComponentName) {
      componentName = exportedComponentName;
    }

    // まだ見つからない場合は、デフォルトで「Component」や「CounterApp」を探す
    if (!componentName) {
      if (strippedCode.includes('const Component =') || 
          strippedCode.includes('function Component(') || 
          strippedCode.includes('class Component extends')) {
        componentName = 'Component';
      } else if (strippedCode.includes('const CounterApp =') || 
                 strippedCode.includes('function CounterApp(') || 
                 strippedCode.includes('class CounterApp extends')) {
        componentName = 'CounterApp';
      } else {
        // 安全のためにラップするコード
        strippedCode = `const Component = () => { 
          return (
            <div className="text-red-500 p-4 border border-red-300 rounded">
              コンポーネントが見つかりません。「Component」という名前で定義してください。
            </div>
          );
        };
        ${strippedCode}`;
        componentName = 'Component';
      }
    }

    // JSXをBabelで変換 (モジュール変換プラグインを追加)
    const transformedCode = Babel.transform(strippedCode, {
      presets: ['react', 'env'],
      plugins: ['transform-modules-commonjs'],
      filename: 'component.jsx'
    }).code;

    // console.log('Transformed code:', transformedCode);

    // コンポーネントを直接実行可能な関数に変換
    const executableCode = `
      // モジュールとexportsの変数を定義
      const module = { exports: {} };
      const exports = module.exports;
      
      // 変換されたコードを実行
      ${transformedCode}
      
      // コンポーネントを返す
      return ${componentName};
    `;

    // Function コンストラクタを使ってコードを実行
    try {
      console.log('Component name:', componentName);
      console.log('Executing code with scope keys:', Object.keys(scope));
      
      const factory = new Function(...Object.keys(scope), executableCode);
      const component = factory(...Object.values(scope));
      
      console.log('Component evaluation result type:', typeof component);
      
      // コンポーネントが関数であることを確認
      if (typeof component === 'function') {
        console.log('Successfully evaluated component function');
        return component;
      } else {
        console.error('Result is not a component function:', component);
        throw new Error('返されたオブジェクトはReactコンポーネントではありません');
      }
    } catch (evalError) {
      console.error('コンポーネント評価エラー:', evalError);
      throw new Error(`コンポーネントの評価に失敗しました: ${evalError.message}`);
    }
  } catch (error) {
    console.error('コンパイルエラー:', error);
    return () => (
      <div className="p-4 bg-red-100 rounded">
        <h3 className="text-lg font-semibold text-red-600">エラー</h3>
        <p className="whitespace-pre-wrap text-red-500">
          {(error as Error).message}
        </p>
      </div>
    );
  }
};

const ComponentPreviewer: React.FC = () => {
  const [code, setCode] = useState<string>('');
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState<boolean>(true);
  const editorRef = useRef<any>(null);

  // サンプルコード
  const defaultCode = `import { useState } from 'react';

const CounterApp = () => {
  const [count, setCount] = useState(0);
  
  const increment = () => {
    setCount(count + 1);
  };
  
  const decrement = () => {
    setCount(count - 1);
  };
  
  const reset = () => {
    setCount(0);
  };
  
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gray-100 rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-6">カウンターアプリ</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 w-full max-w-md">
        <div className="text-6xl font-bold text-center mb-4">{count}</div>
        
        <div className="flex justify-center gap-4">
          <button 
            onClick={decrement}
            className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200"
          >
            -1
          </button>
          
          <button 
            onClick={reset}
            className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors duration-200"
          >
            リセット
          </button>
          
          <button 
            onClick={increment}
            className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200"
          >
            +1
          </button>
        </div>
      </div>
      
      <div className="text-gray-600">
        上のボタンを押してカウントを変更してください
      </div>
    </div>
  );
};

export default CounterApp;`;

  // 初期化時にデフォルトコードをセット
  useEffect(() => {
    setCode(defaultCode);
    compileAndSetComponent(defaultCode);
  }, []);

  // クリップボードから貼り付けられたコードを処理
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // テキストエリアやinputにフォーカスがある場合は、そのままペーストを許可
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
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  // コードをコンパイルしてコンポーネントをセット
  const compileAndSetComponent = (codeToCompile: string) => {
    try {
      const CompiledComponent = compileJSX(codeToCompile);
      setComponent(() => CompiledComponent);
      setError(null);
    } catch (err) {
      setComponent(() => CounterDemo);
      setError(`コンパイルエラー: ${(err as Error).message}`);
    }
  };

  // コードが変更されたときに再コンパイル
  useEffect(() => {
    if (code) {
      compileAndSetComponent(code);
    }
  }, [code]);

  // エディタの設定を処理
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  return (
    <div style={{width: '100vw', maxWidth: '100vw', margin: 0, padding: 0, boxSizing: 'border-box', overflowX: 'hidden'}} className="bg-white">
      <div className="flex justify-between items-center mb-1 px-1" style={{width: '100%'}}>
        <h1 className="text-xl font-bold">Claude Artifact Previewer</h1>
        <div className="flex items-center gap-2">
          <p className="text-gray-600 text-xs">⌘V でコードをペースト</p>
          <button 
            className="bg-gray-200 hover:bg-gray-300 px-1 py-0.5 rounded text-xs"
            onClick={() => setShowCode(!showCode)}
          >
            {showCode ? 'コードを非表示' : 'コードを表示'}
          </button>
        </div>
      </div>
      
      <div style={{width: '100vw', maxWidth: '100vw', margin: 0, padding: 0, display: 'flex', flexDirection: showCode ? 'row' : 'column', flexWrap: 'nowrap'}}>
        {/* コードエディタ */}
        {showCode && <div style={{flex: '1 1 50%', maxWidth: '50%', padding: '2px', backgroundColor: '#f3f4f6'}}>
          <h2 className="text-sm font-semibold mb-0.5">コード</h2>
          <div style={{height: '75vh', width: '100%', border: '1px solid #d1d5db'}}>
            <Editor
              height="100%"
              defaultLanguage="jsx"
              value={code}
              onChange={(value) => setCode(value || '')}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                tabSize: 2,
              }}
            />
          </div>
          <div className="mt-1">
            <button 
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-sm text-sm"
              onClick={() => compileAndSetComponent(code)}
            >
              コードを実行
            </button>
          </div>
        </div>}

        {/* プレビュー */}
        <div style={{flex: showCode ? '1 1 50%' : '1 1 100%', maxWidth: showCode ? '50%' : '100%', padding: '2px', backgroundColor: 'white'}}>
          <h2 className="text-sm font-semibold mb-0.5">プレビュー</h2>
          <div style={{border: '1px solid #d1d5db', minHeight: '75vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto'}}>
            {error ? (
              <div className="bg-red-50 p-4 rounded w-full">
                <div className="text-red-500 whitespace-pre-wrap mb-4">{error}</div>
                {Component && <Component />}
              </div>
            ) : Component ? (
              <React.Suspense fallback={<div>Loading...</div>}>
                <Component />
              </React.Suspense>
            ) : (
              <div className="text-gray-400">
                コードをペーストしてコンポーネントをプレビュー
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComponentPreviewer;
