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
    d3: any; // D3.jsをグローバルに利用可能にする
  }
}

import * as htmlToImage from 'html-to-image';
// グラフライブラリなど
import * as recharts from 'recharts';
import _ from 'lodash';
import Papa from 'papaparse';
// 必要なアイコンのみをインポート
import { FaGithub } from 'react-icons/fa';
import * as lucideReact from 'lucide-react';

// よく使うコンポーネントを直接 scope に追加するために分割代入
const {
  ResponsiveContainer, LineChart, BarChart, PieChart, AreaChart, ScatterChart, ComposedChart, RadarChart, Treemap, RadialBarChart, Bar, // Bar を追加
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, Label, LabelList, ReferenceLine, ReferenceDot, ReferenceArea, Brush, Customized, Funnel, FunnelChart, Sector, Text, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadialBar,
} = recharts;

// よく使う Lucide アイコンを直接 scope に追加 (名前衝突を回避)
// Note: Clock, Code, Globe, Users, Database, Mountain, Wine, Heart, Zap were already included in the previous large list.
// Home was also already included.
// Workflow was added in the last step.
// This diff doesn't actually need to change the destructuring list as all requested icons were already present.
// Re-applying the same list for clarity and ensuring nothing was missed.
const {
  Activity, Airplay, AlertCircle, AlertOctagon, AlertTriangle, AlignCenter, AlignJustify, AlignLeft, AlignRight, Anchor, Aperture, Archive, ArrowDownCircle, ArrowDownLeft, ArrowDownRight, ArrowDown, ArrowLeftCircle, ArrowLeft, ArrowRightCircle, ArrowRight, ArrowUpCircle, ArrowUpLeft, ArrowUpRight, ArrowUp, AtSign, Award, BarChart2, LucideBarChart, BatteryCharging, Battery, BellOff, BellRing, Bell, Bluetooth, Bold, BookOpen, Book, Bookmark, Box, Briefcase, Calendar, CameraOff, Camera, Cast, CheckCircle, CheckSquare, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsDown, ChevronsLeft, ChevronsRight, ChevronsUp, Chrome, Circle, Clipboard, Clock, CloudDrizzle, CloudLightning, CloudOff, CloudRain, CloudSnow, Cloud, Code, Codepen, Codesandbox, Coffee, Columns, Command, Compass, Copy, CornerDownLeft, CornerDownRight, CornerLeftDown, CornerLeftUp, CornerRightDown, CornerRightUp, CornerUpLeft, CornerUpRight, Cpu, CreditCard, Crop, Crosshair, Database, Delete, Disc, DivideCircle, DivideSquare, Divide, DollarSign, DownloadCloud, Download, Dribbble, Droplet, Edit2, Edit3, Edit, ExternalLink, EyeOff, Eye, Facebook, FastForward, Feather, Figma, FileMinus, FilePlus, FileText, File, Film, Filter, Flag, FolderMinus, FolderPlus, Folder, Framer, Frown, Gift, GitBranch, GitCommit, GitMerge, GitPullRequest, Github, Gitlab, Globe, Grid, HardDrive, Hash, Headphones, Heart, HelpCircle, Hexagon, Home, Image, Inbox, Info, Instagram, Italic, Key, Layers, Layout, LifeBuoy, Link2, Link, Linkedin, List, Loader, Lock, LogIn, LogOut, Mail, MapPin, Map, Maximize2, Maximize, Meh, Menu, MessageCircle, MessageSquare, MicOff, Mic, Minimize2, Minimize, MinusCircle, MinusSquare, Minus, Monitor, Moon, MoreHorizontal, MoreVertical, MousePointer, Move, Music, Mountain,
  Navigation2, Navigation, Octagon, Package, Paperclip, PauseCircle, Pause, PenTool, Percent, PhoneCall, PhoneForwarded, PhoneIncoming, PhoneMissed, PhoneOff, PhoneOutgoing, Phone, LucidePieChart, PlayCircle, Play, PlusCircle, PlusSquare, Plus, Pocket, Power, Printer, Radio, RefreshCcw, RefreshCw, Repeat, Rewind, RotateCcw, RotateCw, Rss, Save, Scissors, Search, Send, Server, Settings, Share2, Share, ShieldOff, Shield, ShoppingBag, ShoppingCart, Shuffle, Sidebar, SkipBack, SkipForward, Slack, Slash, Sliders, Smartphone, Smile, Speaker, Square, Star, StopCircle, Sun, Sunrise, Sunset, Tablet, Tag, Target, Terminal, Thermometer, ThumbsDown, ThumbsUp, ToggleLeft, ToggleRight, Tool, Trash2, Trash, Trello, TrendingDown, TrendingUp, Triangle, Truck, Tv, Twitch, Twitter, Type, Umbrella, Underline, Unlock, UploadCloud, Upload, UserCheck, UserMinus, UserPlus, UserX, User, Users, VideoOff, Video, Voicemail, Volume1, Volume2, VolumeX, Volume, Watch, WifiOff, Wifi, Wind, Wine,
  Workflow, XCircle, XOctagon, XSquare, X, Youtube, Zap,
  ZoomIn, ZoomOut
} = lucideReact;

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
  console.log('Entering downloadElementAsImage. Element:', element, 'FileName:', fileName, 'Format:', format); // ★デバッグログ追加

  if (!element) {
    console.error('downloadElementAsImage called with invalid element:', element);
    return;
  }
  
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
      // 元の背景色を保存（現在は背景色変更がコメントアウトされているため、こちらもコメントアウト）
      // const originalBackgroundColor = element.style.backgroundColor;
      // Set dimensions
      const rect = element.getBoundingClientRect();
      console.log('Element dimensions:', rect);
      
      // Use html-to-image for better gradient support
      const dataUrl = await htmlToImage.toPng(element, {
        // backgroundColor: '#FFFFFF',
        pixelRatio: 2, // Higher resolution
        quality: 1.0,
        skipFonts: true, // Skip external fonts to avoid CORS issues
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
      
      // 背景色を元に戻す（現在は背景色変更がコメントアウトされているため、こちらもコメントアウト）
      // element.style.backgroundColor = originalBackgroundColor;
     } catch (err) {
       console.error('Failed to capture element:', err);
       // エラー時も背景色を元に戻す（現在は背景色変更がコメントアウトされているため、こちらもコメントアウト）
       // try { element.style.backgroundColor = originalBackgroundColor; } catch {} // originalBackgroundColorが未定義の場合のエラーを防ぐ
     }
   };
  
  captureElement();
};

// Add syntax highlighter script and ESBuild to head
const addScriptsToHead = (onEsbuildReady: () => void) => {
  // ESBuildを追加
  const esbuildScript = document.createElement('script');
  esbuildScript.src = 'https://unpkg.com/esbuild-wasm@0.14.54/lib/browser.min.js';
  esbuildScript.async = true;
  
  // D3.jsをCDNから追加
  const d3Script = document.createElement('script');
  d3Script.src = 'https://d3js.org/d3.v7.min.js';
  d3Script.async = true;
  
  // ESBuildスクリプトの読み込み完了後に初期化を実行
  esbuildScript.onload = () => {
    // ESBuildの初期化
    if (window.esbuild) {
      window.esbuild.initialize({
        wasmURL: 'https://unpkg.com/esbuild-wasm@0.14.54/esbuild.wasm'
      }).then(() => {
        console.log('ESBuild初期化完了');
        onEsbuildReady(); // 初期化完了後のコールバック
      }).catch(e => {
        console.error('Failed to initialize esbuild:', e);
      });
    }
  };

  document.head.appendChild(d3Script);
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
      // Libraries (全体もアクセス可能にする)
      recharts,
      lucideReact,
      _,
      Papa,
      // D3.js
      d3: window.d3,
      // React Icons（必要なものだけを追加）
      FaGithub,
      // Direct components from recharts (よく使うものを直接アクセス可能に)
      ResponsiveContainer, LineChart, BarChart, PieChart, AreaChart, ScatterChart, ComposedChart, RadarChart, Treemap, RadialBarChart, Bar, // Bar を追加
      XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, Label, LabelList, ReferenceLine, ReferenceDot, ReferenceArea, Brush, Customized, Funnel, FunnelChart, Sector, Text, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadialBar,
      // Direct icons from lucide-react (よく使うものを直接アクセス可能に、名前衝突回避)
      // Note: This list mirrors the destructuring above.
      Activity, Airplay, AlertCircle, AlertOctagon, AlertTriangle, AlignCenter, AlignJustify, AlignLeft, AlignRight, Anchor, Aperture, Archive, ArrowDownCircle, ArrowDownLeft, ArrowDownRight, ArrowDown, ArrowLeftCircle, ArrowLeft, ArrowRightCircle, ArrowRight, ArrowUpCircle, ArrowUpLeft, ArrowUpRight, ArrowUp, AtSign, Award, BarChart2, LucideBarChart, BatteryCharging, Battery, BellOff, BellRing, Bell, Bluetooth, Bold, BookOpen, Book, Bookmark, Box, Briefcase, Calendar, CameraOff, Camera, Cast, CheckCircle, CheckSquare, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsDown, ChevronsLeft, ChevronsRight, ChevronsUp, Chrome, Circle, Clipboard, Clock, CloudDrizzle, CloudLightning, CloudOff, CloudRain, CloudSnow, Cloud, Code, Codepen, Codesandbox, Coffee, Columns, Command, Compass, Copy, CornerDownLeft, CornerDownRight, CornerLeftDown, CornerLeftUp, CornerRightDown, CornerRightUp, CornerUpLeft, CornerUpRight, Cpu, CreditCard, Crop, Crosshair, Database, Delete, Disc, DivideCircle, DivideSquare, Divide, DollarSign, DownloadCloud, Download, Dribbble, Droplet, Edit2, Edit3, Edit, ExternalLink, EyeOff, Eye, Facebook, FastForward, Feather, Figma, FileMinus, FilePlus, FileText, File, Film, Filter, Flag, FolderMinus, FolderPlus, Folder, Framer, Frown, Gift, GitBranch, GitCommit, GitMerge, GitPullRequest, Github, Gitlab, Globe, Grid, HardDrive, Hash, Headphones, Heart, HelpCircle, Hexagon, Home, Image, Inbox, Info, Instagram, Italic, Key, Layers, Layout, LifeBuoy, Link2, Link, Linkedin, List, Loader, Lock, LogIn, LogOut, Mail, MapPin, Map, Maximize2, Maximize, Meh, Menu, MessageCircle, MessageSquare, MicOff, Mic, Minimize2, Minimize, MinusCircle, MinusSquare, Minus, Monitor, Moon, MoreHorizontal, MoreVertical, MousePointer, Move, Music, Mountain,
      Navigation2, Navigation, Octagon, Package, Paperclip, PauseCircle, Pause, PenTool, Percent, PhoneCall, PhoneForwarded, PhoneIncoming, PhoneMissed, PhoneOff, PhoneOutgoing, Phone, LucidePieChart, PlayCircle, Play, PlusCircle, PlusSquare, Plus, Pocket, Power, Printer, Radio, RefreshCcw, RefreshCw, Repeat, Rewind, RotateCcw, RotateCw, Rss, Save, Scissors, Search, Send, Server, Settings, Share2, Share, ShieldOff, Shield, ShoppingBag, ShoppingCart, Shuffle, Sidebar, SkipBack, SkipForward, Slack, Slash, Sliders, Smartphone, Smile, Speaker, Square, Star, StopCircle, Sun, Sunrise, Sunset, Tablet, Tag, Target, Terminal, Thermometer, ThumbsDown, ThumbsUp, ToggleLeft, ToggleRight, Tool, Trash2, Trash, Trello, TrendingDown, TrendingUp, Triangle, Truck, Tv, Twitch, Twitter, Type, Umbrella, Underline, Unlock, UploadCloud, Upload, UserCheck, UserMinus, UserPlus, UserX, User, Users, VideoOff, Video, Voicemail, Volume1, Volume2, VolumeX, Volume, Watch, WifiOff, Wifi, Wind, Wine,
      Workflow, XCircle, XOctagon, XSquare, X, Youtube, Zap,
      ZoomIn, ZoomOut,
    };

    // Strip import/export statements (more carefully)
    let strippedCode = code;
    
    // Remove imports
    strippedCode = strippedCode
      .replace(/import\s+.*?from\s+['"].*?['"]\s*;?/g, '')
      .replace(/import\s+{.*?}\s+from\s+['"].*?['"]\s*;?/g, '')
      .replace(/import\s+['"].*?['"]\s*;?/g, '');
    
    // 優先的にexport defaultで定義されたコンポーネントを検出する
    const defaultExportPattern = /export\s+default\s+([A-Z][A-Za-z0-9_]*)/;
    let defaultExportMatch = code.match(defaultExportPattern);
    let componentName: string | null = defaultExportMatch ? defaultExportMatch[1] : null;
    
    // export default が見つからない場合は他のパターンを検索
    if (!componentName) {
      // Component detection regex patterns (improved)
      const constComponentPattern = /const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*(?:\(|\s*=>|\s*function\s*\()/;
      const functionComponentPattern = /function\s+([A-Z][A-Za-z0-9_]*)\s*\(/;
      const classComponentPattern = /class\s+([A-Z][A-Za-z0-9_]*)\s+extends\s+(?:React\.)?Component/;
      
      let match: RegExpExecArray | null;
      
      if ((match = constComponentPattern.exec(strippedCode)) !== null) {
        componentName = match[1];
      } else if ((match = functionComponentPattern.exec(strippedCode)) !== null) {
        componentName = match[1];
      } else if ((match = classComponentPattern.exec(strippedCode)) !== null) {
        componentName = match[1];
      }
    }
    
    // Remove exports
    strippedCode = strippedCode
      .replace(/export\s+default\s+[A-Z][A-Za-z0-9_]*/g, '')
      .replace(/export\s+default\s+/g, '')
      .replace(/export\s+/g, '');

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
  const [mode, setMode] = useState<'react' | 'html'>('react'); // モード：ReactコードかHTMLか
  const [esbuildReady, setEsbuildReady] = useState<boolean>(false); // ESBuildの初期化状態
  const [pendingCode, setPendingCode] = useState<string | null>(null); // 初期化待ちのコード
  const previewRef = useRef<HTMLDivElement>(null);
  const componentRef = useRef<HTMLDivElement>(null); // コンポーネント自体を参照するためのref
  const htmlPreviewRef = useRef<HTMLIFrameElement>(null);

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

  // HTML用のサンプルコード
  const sampleHtmlCode = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>シンプルなHTMLサンプル</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 p-8">
    <div class="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow-md">
        <h1 class="text-2xl font-bold text-gray-800 mb-4">HTMLプレビュー</h1>
        <p class="text-gray-600 mb-4">
            この部分はHTMLとしてプレビューされます。
            Tailwind CSSも利用可能です。
        </p>
        <div class="bg-blue-100 p-4 rounded-lg mb-4">
            <p class="text-blue-800">
                ここにはHTMLコードを直接記述できます。
            </p>
        </div>
        <button class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded hover:opacity-90 transition-opacity">
            ボタンサンプル
        </button>
    </div>
</body>
</html>`;

  // サンプルコードを読み込む
  const loadSample = () => {
    // 現在のモードに基づいてサンプルを選択
    const sampleToLoad = mode === 'html' ? sampleHtmlCode : sampleCode;
    setCode(sampleToLoad);
    
    // 自動判定も実行
    compileAndSetComponent(sampleToLoad);
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
        let fixedCode = pastedCode;
        const isMermaidSnippet = /<(?:div|pre)[^>]*class=["']mermaid["'][^>]*>/i.test(pastedCode);
        if (detectCodeType(pastedCode) === 'html' || isMermaidSnippet) {
          fixedCode = preprocessMermaidSyntax(pastedCode);
        }
        setCode(fixedCode);
        compileAndSetComponent(fixedCode);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [mode]); // modeが変わったときにも適用されるようにする

  // HTMLかReactかを判定する関数
  const detectCodeType = (code: string): 'react' | 'html' => {
    // HTMLの特徴を検出
    const htmlFeatures = [
      /<!DOCTYPE\s+html>/i.test(code),
      /<html/i.test(code),
      /<head>/.test(code),
      /<body/.test(code)
    ];
    
    // Reactの特徴を検出
    const reactFeatures = [
      /import\s+.*from\s+/i.test(code),
      /export\s+default\s+/i.test(code),
      /function\s+[A-Z][A-Za-z0-9]*\s*\(/i.test(code),
      /const\s+[A-Z][A-Za-z0-9]*\s*=/i.test(code) && /=>\s*{/.test(code),
      /useState|useEffect|useRef|React\.Component/i.test(code)
    ];
    
    // 特徴の数を数える
    const htmlFeatureCount = htmlFeatures.filter(Boolean).length;
    const reactFeatureCount = reactFeatures.filter(Boolean).length;
    
    // より多くの特徴がある方を選択
    return htmlFeatureCount > reactFeatureCount ? 'html' : 'react';
  };

  // Mermaid記法のエラーになりやすい構文を事前補正する関数を追加
  const preprocessMermaidSyntax = (html: string): string => {
    return html.replace(
      /(<(?:div|pre)[^>]*class=["']mermaid["'][^>]*>)([\s\S]*?)(<\/(?:div|pre)>)/g,
      (_match: string, start: string, content: string, end: string) => {
        // インラインの「%」コメントを削除する処理は、ユーザーの指示により無効化
        const withoutComments = content; // contentをそのまま使う
        // subgraph のタイトルが引用符で囲まれていない場合、ダブルクォートで囲む
        const quotedSubgraphs = withoutComments.replace(/^(\s*subgraph\s+)(?!["'])(.*)$/gm, '$1"$2"');
        // ノードやエッジの説明文内の半角記号を全角に変換（ラベル内のみ: [], {} 内）
        let replaced = quotedSubgraphs;
        // [], {}, (())内の半角記号を全角に変換
        replaced = replaced.replace(/(\[[^\]]+\])|(\{[^\}]+\})|(\(\([^\)]+\)\))/g, (match: string) => {
          const start = match.startsWith('[') ? '[' : match.startsWith('{') ? '{' : '((';
          const end = match.endsWith(']') ? ']' : match.endsWith('}') ? '}' : '))';
          const label = match.slice(start.length, -end.length);
          return `${start}${label
            .replace(/"/g, "'") // ダブルクォートを &quot; にエスケープ
            .replace(/\(/g,'（')
            .replace(/\)/g,'）')
            .replace(/:/g,'：')
            .replace(/,/g,'，')
            .replace(/;/g,'；')}${end}`;
        }
        );
        return `${start}${replaced}${end}`;
      }
    );
  };

  // Compile code and set component
  const compileAndSetComponent = async (codeToCompile: string) => {
    // Reactモードでかつ、ESBuildが初期化されていない場合は待機
    if (!esbuildReady && detectCodeType(codeToCompile) === 'react') {
      console.log('ESBuild初期化待ち - コードを保存します');
      setPendingCode(codeToCompile);
      return;
    }
    
    // コードタイプを自動判定
    const detectedMode = detectCodeType(codeToCompile);
    
    // 必要な場合はモードを更新
    if (mode !== detectedMode) {
      setMode(detectedMode);
      console.log(`コードタイプを自動判定: ${detectedMode}`);
    }
    
    if (detectedMode === 'html') {
      // HTMLモードではコンパイル不要
      setComponent(null);
      setError(null);
      // HTMLプレビューの更新はレンダリング時に行う
      return;
    }
    
    // Reactモードの場合
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
    // ESBuild初期化完了時のコールバック
    const handleEsbuildReady = () => {
      setEsbuildReady(true);
      
      // 初期化待ちのコードがあれば処理する
      if (pendingCode) {
        compileAndSetComponent(pendingCode);
        setPendingCode(null);
      }
    };
    
    addScriptsToHead(handleEsbuildReady);
  }, [pendingCode]);

  // Download preview as image with improved styling
  const handleDownloadPreview = () => {
    console.log('handleDownloadPreview called. Mode:', mode); // ★デバッグログ追加

    // HTMLモードの場合
    if (mode === 'html' && htmlPreviewRef.current) {
      console.log('Handling HTML mode. iframe ref:', htmlPreviewRef.current); // ★デバッグログ追加
      try {
        const iframe = htmlPreviewRef.current;
        
        // iframeのコンテンツをキャプチャするためのCanvasを作成
        const captureIframe = async () => {
          console.log('Entering captureIframe'); // ★デバッグログ追加
          const iframeDoc = iframe.contentDocument;
          if (!iframeDoc) {
            console.error('Could not get iframe document.');
            return;
          }
          const iframeWindow = iframe.contentWindow;
          if (!iframeWindow) {
            console.error('Could not get iframe window.');
            return;
          }
          console.log('captureIframe: Got iframe doc and window'); // ★デバッグログ追加
 
          // iframeのサイズを取得
          const iframeWidth = iframe.offsetWidth;
          const iframeHeight = iframe.offsetHeight;
          console.log('captureIframe: iframe dimensions:', iframeWidth, iframeHeight); // ★デバッグログ追加
 
          // bodyのサイズを取得
          const body = iframeDoc.body;
          const contentWidth = body.scrollWidth;
          const contentHeight = body.scrollHeight;
          console.log('captureIframe: content dimensions:', contentWidth, contentHeight); // ★デバッグログ追加
 
          // Mermaidダイアグラムがある場合、レンダリングが完了するのを待つ
          const mermaidElements = iframeDoc.body.querySelectorAll('.mermaid');
          if (mermaidElements.length > 0) {
            console.log('captureIframe: Waiting for Mermaid...'); // ★デバッグログ追加
            // Mermaidのレンダリングが完了するのを待つ
            await new Promise(resolve => setTimeout(resolve, 1000)); 
            console.log('captureIframe: Finished waiting for Mermaid.'); // ★デバッグログ追加
          }
 
          // body全体をキャプチャ対象とする
          const mainContent = body; // 常にbody全体を選択
          console.log('captureIframe: Determined mainContent (entire body):', mainContent); // ★ログ更新

          // === 背景色取得ロジック追加 ===
          let computedBgColor = 'transparent';
          try {
            const computedStyle = iframeDoc.defaultView?.getComputedStyle(body);
            if (computedStyle) {
              const bg = computedStyle.getPropertyValue('background-color');
              if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                computedBgColor = bg;
              }
            }
          } catch (e) {
            console.warn('背景色の取得に失敗:', e);
          }
          console.log('captureIframe: computed background color:', computedBgColor);
          // === ここまで ===

          try { // ★エラーキャッチのためtry...catchを追加
            console.log('captureIframe: Calling htmlToImage.toPng...'); // ★デバッグログ追加
            const dataUrl = await htmlToImage.toPng(mainContent as HTMLElement, {
              width: contentWidth,
              height: contentHeight,
              canvasWidth: contentWidth * 2, // Use content size for canvas
              canvasHeight: contentHeight * 2,
              pixelRatio: 2,
              backgroundColor: computedBgColor, // ← ここを修正
              skipFonts: true, // Skip external fonts
              style: {
                // 元の要素のスタイルを維持しつつ、スケールを1に固定
                transform: 'scale(1)', 
                transformOrigin: 'top left',
                width: `${contentWidth}px`,
                height: `${contentHeight}px`,
                margin: '0', // Remove potential margins
                padding: '0', // Remove potential padding
                backgroundColor: computedBgColor // ← ここも修正
              }
            });
            console.log('captureIframe: htmlToImage.toPng finished.'); // ★デバッグログ追加
 
            // Create download link
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = 'commandv-html-preview.png';
            link.click();
          } catch (err) { // ★エラーキャッチ
            console.error('captureIframe: Error during htmlToImage.toPng or download:', err);
          }
        };
        
        captureIframe();
      } catch (err) {
        console.error('Failed to capture iframe:', err);
      }
      return;
    }
    
    // Reactモードの場合
    if (component && componentRef.current) {
      console.log('Handling React mode. Component exists:', !!component, 'Component ref:', componentRef.current); // ★デバッグログ追加
      const element = componentRef.current;
      const originalElementStyle = element.getAttribute('style') || '';
 
       // キャプチャ関数を定義
       const captureComponent = async () => {
        console.log('captureComponent called. Element:', element); // ★デバッグログ追加
        try {
          // Mermaidダイアグラムがある場合、レンダリングが完了するのを待つ
          const mermaidElements = element.querySelectorAll('.mermaid');
          if (mermaidElements.length > 0) {
            // Mermaidのレンダリングが完了するのを待つ
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          // キャプチャ処理を実行
          return await htmlToImage.toPng(element, {
            backgroundColor: 'transparent',
            pixelRatio: 2, // Higher resolution
            quality: 1.0,
            skipFonts: true, // Skip external fonts to avoid CORS issues
            style: {
              transform: 'scale(1)',
              transformOrigin: 'top left',
              backgroundColor: 'transparent' // スタイルでも背景を透明に
            }
          });
        } catch (err) {
          console.error('Failed to capture element:', err);
        }
      };
      
      // 非同期処理を実行
      captureComponent().then((dataUrl: string | undefined) => {
        // dataUrlが取得できた場合のみダウンロード処理を実行
        if (dataUrl) {
          // Create download link
          const link = document.createElement('a');
          link.download = `${component?.displayName || 'component'}.png`;
          link.href = dataUrl;
          link.click();
          
          // Restore original styling
          element.setAttribute('style', originalElementStyle);         
        } else {
          // Restore original styling even if capture failed
          element.setAttribute('style', originalElementStyle);
        }
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
        
        <div className="flex items-center gap-3">
          
          <button
            className="px-3 py-1 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
            onClick={() => setShowCode(!showCode)}
          >
            {showCode ? "Hide Code" : "Show Code"}
          </button>
          
          <button
            className="px-4 py-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-md hover:opacity-90 transition-opacity text-sm"
            onClick={handleDownloadPreview}
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
              {/* Monaco Editor */}
              <div className="border rounded-md overflow-hidden w-full h-full">
                <Editor
                  height="100%"
                  defaultLanguage={mode === 'html' ? "html" : "javascript"}
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
                プレビュー表示
              </button>
            </div>
          </div>
        )}
        
        {/* Preview */}
        <div className={`${showCode ? 'w-1/2' : 'w-full'} flex flex-col overflow-hidden`}>
          {mode === 'html' ? (
            // HTMLモードのプレビュー
            <div className="flex-1 flex flex-col overflow-hidden bg-gray-50" style={{ height: 'calc(80vh - 100px)' }}>
              {code ? (
                <iframe
                  ref={htmlPreviewRef}
                  className="w-full h-full border-none"
                  srcDoc={code}
                  title="HTML Preview"
                  sandbox="allow-scripts allow-same-origin"
                ></iframe>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-8">
                    <h2 className="text-xl font-semibold mb-4">HTMLプレビューモード</h2>
                    <p className="text-gray-600 mb-6">HTMLコードを入力するか、サンプルを読み込んでください。</p>
                    <button
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                      onClick={loadSample}
                    >
                      サンプルHTMLを読み込む
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Reactモードのプレビュー
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
                    <div
                      ref={componentRef}
                      className="w-full h-auto items-center justify-center"
                      style={{ minHeight: 'auto' }}
                    >
                      {React.createElement(component)}
                    </div>
                  </React.Suspense>
                ) : (
                  <WelcomeScreen onLoadSample={loadSample} />
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComponentPreviewer;
