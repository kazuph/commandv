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

// Mermaid用の自動補正は原則オフ（不要/有害な書き換えを避ける）
const ENABLE_MERMAID_PREPROCESS = false;

import AppleLogo from './AppleLogo';
import WelcomeScreen from './WelcomeScreen';
import SampleCounter from './SampleCounter';
import RecentDiagramStrip from './RecentDiagramStrip';
import UserMenu from './UserMenu';
import ShareDialog from './ShareDialog';

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

// デバイス判定ユーティリティ
const isMobile = () => typeof window !== 'undefined' && (/iPhone|iPad|iPod|Android|Mobile|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile|WPDesktop/i.test(window.navigator.userAgent) || window.matchMedia('(max-width: 768px)').matches);

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
  const [showHeader, setShowHeader] = useState<boolean>(true); // 帯の表示制御
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);
  const [canPaste, setCanPaste] = useState<boolean>(false); // モバイル用ペースト可否
  const [toast, setToast] = useState<{type: 'success'|'error'; message: string} | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [currentTitle, setCurrentTitle] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<boolean>(false);

  // HTMLプレビュー用のsrcDocを生成（Mermaid未読み込み時にUMD版を注入）
  const iframeSrcDoc = React.useMemo(() => {
    if (mode !== 'html') return '';
    if (!code) return '';

    const hasHtmlRoot = /<html[\s>]/i.test(code) || /<!DOCTYPE\s+html>/i.test(code);
    const hasMermaidBlock = /class=["']mermaid["']/i.test(code);
    const hasMermaidScript = /(cdn\.jsdelivr\.net\/npm\/mermaid|unpkg\.com\/mermaid|mermaid(?:\.min)?\.js|mermaid\.esm)/i.test(code);

    // ベースHTMLの用意（<html>が無い場合のみラップ）
    let html = hasHtmlRoot
      ? code
      : `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body>${code}</body></html>`;

    // Mermaidブロックがあるのにスクリプトが無ければUMD版を注入
    if (hasMermaidBlock && !hasMermaidScript) {
      const mermaidScriptTag = `<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>`;
      const mermaidInitScript = `<script>try{window.mermaid&&window.mermaid.initialize({startOnLoad:true,securityLevel:'loose'});}catch(e){console.error('Mermaid init error:',e);}</script>`;

      // </head> の直前にスクリプトを入れる（無ければ先頭に挿入）
      if (/<\/head>/i.test(html)) {
        html = html.replace(/<\/head>/i, `${mermaidScriptTag}\n${mermaidInitScript}</head>`);
      } else {
        html = html.replace(/<body[^>]*>/i, match => `${mermaidScriptTag}\n${mermaidInitScript}\n${match}`);
      }
    }

    return html;
  }, [mode, code]);
  
  // ユーザー確認
  const ensureLogin = async () => {
    try {
      const r = await fetch('/auth/me')
      const j = await r.json()
      if (!j.user) {
        window.location.href = '/auth/google/login'
        return null
      }
      return j.user
    } catch {
      window.location.href = '/auth/google/login'
      return null
    }
  }

  const showToast = (type: 'success'|'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 2200)
  }

  const handleClear = () => {
    setCode('')
    setComponent(null)
    setError(null)
    // タイトルや編集状態もリセット（トップに戻ったときに残らないように）
    setCurrentId(null)
    setCurrentTitle(null)
    setEditingTitle(false)
    // 初期画面に戻すためにモードもReactに戻す
    try { setMode('react') } catch {}
    // URLをトップに戻す
    try { window.history.replaceState({}, '', '/') } catch {}
    showToast('success', 'クリアしました')
  }

  // 画像生成（モード別）
  const capturePreview = async (): Promise<string | undefined> => {
    try {
      if (mode === 'html' && htmlPreviewRef.current) {
        const iframe = htmlPreviewRef.current;
        const iframeDoc = iframe.contentDocument;
        if (!iframeDoc) return undefined
        const body = iframeDoc.body;
        const contentWidth = body.scrollWidth;
        const contentHeight = body.scrollHeight;
        let computedBgColor = 'transparent';
        try {
          const computedStyle = iframeDoc.defaultView?.getComputedStyle(body);
          const bg = computedStyle?.getPropertyValue('background-color');
          if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') computedBgColor = bg;
        } catch {}
        const dataUrl = await htmlToImage.toPng(body as HTMLElement, {
          width: contentWidth,
          height: contentHeight,
          canvasWidth: contentWidth * 2,
          canvasHeight: contentHeight * 2,
          pixelRatio: 2,
          backgroundColor: computedBgColor,
          style: {
            transform: 'scale(1)',
            transformOrigin: 'top left',
            width: `${contentWidth}px`,
            height: `${contentHeight}px`,
            margin: '0',
            padding: '0',
            backgroundColor: computedBgColor,
          }
        })
        return dataUrl
      }
      // Reactモード
      const node = (componentRef.current || previewRef.current) as HTMLElement | null
      if (!node) return undefined
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const dataUrl = await htmlToImage.toPng(node, { pixelRatio: dpr, backgroundColor: '#ffffff' })
      return dataUrl
    } catch {
      return undefined
    }
  }

  // HTML からデフォルトタイトルを抽出（h1 > title の優先）
  const extractHtmlTitle = (html: string): string | null => {
    try {
      const parser = new DOMParser()
      // ラップの有無に関わらず text/html で解析
      const doc = parser.parseFromString(html, 'text/html')
      const h1 = doc.querySelector('h1')
      const h1Text = h1?.textContent?.trim()
      if (h1Text) return h1Text
      const t = doc.querySelector('title')?.textContent?.trim()
      if (t) return t
    } catch {}
    return null
  }

  // Save API 呼び出し
  const handleSaveDiagram = async () => {
    const me = await ensureLogin();
    if (!me) return; // ensureLogin がリダイレクト
    // タイトルのデフォルト決定
    const now = new Date()
    let defaultTitle = `Diagram ${now.toLocaleString()}`
    if (mode === 'html') {
      const found = extractHtmlTitle(code)
      if (found) defaultTitle = found
    }
    // ユーザーに確認
    const input = window.prompt('ファイル名を入力してください', defaultTitle)
    if (input === null) return // キャンセル
    const title = (input.trim() || defaultTitle).slice(0, 200)
    const dataUrl = await capturePreview()
    // 説明のデフォルト抽出
    let defaultDesc = ''
    if (mode === 'html') {
      try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(code, 'text/html')
        const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content') || ''
        const firstP = doc.querySelector('p')?.textContent?.trim() || ''
        defaultDesc = (metaDesc || firstP || '').slice(0, 300)
      } catch {}
    }
    const inputDesc = window.prompt('説明（SlackやSNSのプレビューに表示されます。省略可）', defaultDesc)
    const description = (inputDesc || '').trim().slice(0, 300) || undefined

    const payload = {
      title,
      code,
      mode: mode === 'react' ? 'jsx' : 'html',
      isPrivate: true,
      description,
      imageDataUrl: dataUrl
    }
    const res = await fetch('/api/diagrams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) {
      if (res.status === 401) { window.location.href = '/auth/google/login'; return }
      showToast('error', '保存に失敗しました')
      return
    }
    const json = await res.json()
    // 保存後に個別ページへ遷移（OGP対応）
    if (json.id) {
      window.history.pushState({}, '', `/d/${json.id}`)
      showToast('success', '保存しました')
      setCurrentId(json.id as string)
      setCurrentTitle(title)
    }
  }

  // Anonymous quick share (no login, 3-day expiry)
  const handleQuickShare = async () => {
    // default title
    const now = new Date()
    let defaultTitle = `Diagram ${now.toLocaleString()}`
    if (mode === 'html') {
      const found = extractHtmlTitle(code)
      if (found) defaultTitle = found
    }
    const input = window.prompt('共有用タイトル（省略可）', defaultTitle)
    if (input === null) return
    const title = (input.trim() || defaultTitle).slice(0, 200)
    const dataUrl = await capturePreview()
    // 説明のデフォルト抽出
    let defaultDesc = ''
    if (mode === 'html') {
      try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(code, 'text/html')
        const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content') || ''
        const firstP = doc.querySelector('p')?.textContent?.trim() || ''
        defaultDesc = (metaDesc || firstP || '').slice(0, 300)
      } catch {}
    }
    const inputDesc = window.prompt('説明（SlackやSNSのプレビューに表示されます。省略可）', defaultDesc)
    const description = (inputDesc || '').trim().slice(0, 300) || undefined
    try {
      const res = await fetch('/api/diagrams/guest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, code, mode: mode === 'react' ? 'jsx' : 'html', imageDataUrl: dataUrl })
      })
      if (!res.ok) { showToast('error', 'クイック共有に失敗しました'); return }
      const j = await res.json()
      setShareLink(j.shareUrl || null)
      setShareExpiresAt(j.expiresAt ?? null)
      setShareOpen(true)
    } catch {
      showToast('error', 'クイック共有に失敗しました')
    }
  }

  const handleDeleteCurrent = async () => {
    const m = window.location.pathname.match(/^\/d\/([a-z0-9\-]+)$/i)
    if (!m) { showToast('error', '削除対象がありません'); return }
    const id = m[1]
    if (!confirm('この図解を削除しますか？')) return
    const me = await ensureLogin();
    if (!me) return
    try {
      const r = await fetch(`/api/diagrams/${id}`, { method: 'DELETE' })
      if (!r.ok) { showToast('error', '削除に失敗しました'); return }
      handleClear()
      showToast('success', '削除しました')
    } catch { showToast('error', '削除に失敗しました') }
  }

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
        if ((detectCodeType(pastedCode) === 'html' || isMermaidSnippet) && ENABLE_MERMAID_PREPROCESS) {
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

  // デバイス判定（初回のみ）
  useEffect(() => {
    setIsMobileDevice(isMobile());
    // モバイルでクリップボードAPIサポート確認
    setCanPaste(!!(navigator.clipboard && (navigator.clipboard.readText || navigator.clipboard.read)));
  }, []);

  // /d/:id でのロード
  useEffect(() => {
    const m = window.location.pathname.match(/^\/d\/([a-z0-9\-]+)$/i)
    if (!m) return
    const id = m[1]
    ;(async () => {
      try {
        const res = await fetch(`/api/diagrams/${id}`)
        if (!res.ok) return
        const row = await res.json()
        const serverMode = (row.mode as string) === 'jsx' ? 'react' : 'html'
        setMode(serverMode as 'react' | 'html')
        setCode(row.code as string)
        setCurrentId(id)
        setCurrentTitle((row.title as string) || null)
        if (serverMode === 'react') await compileAndSetComponent(row.code as string)
      } catch {}
    })()
  }, [])

  // /s/:token でのロード（共有ビュー: 読み取り専用）
  const [sharedView, setSharedView] = useState(false)
  const [shareExpired, setShareExpired] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [shareExpiresAt, setShareExpiresAt] = useState<number | null>(null)
  useEffect(() => {
    const m = window.location.pathname.match(/^\/s\/([a-f0-9]{32,})$/i)
    if (!m) return
    const token = m[1]
    setSharedView(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/share/${token}`, { headers: { 'Accept': 'application/json' } })
        if (res.status === 401) { setShareExpired(true); return }
        if (!res.ok) return
        const row = await res.json()
        const serverMode = (row.mode as string) === 'jsx' ? 'react' : 'html'
        setMode(serverMode as 'react' | 'html')
        setCode(row.code as string)
        setCurrentId(row.id as string)
        setCurrentTitle((row.title as string) || null)
        if (serverMode === 'react') await compileAndSetComponent(row.code as string)
      } catch {}
    })()
  }, [])

  // ペースト時にヘッダーを非表示
  useEffect(() => {
    if (isMobileDevice) return;
    
    const hasContent = !!(component || code.trim());
    if (hasContent) {
      setShowHeader(false);
    } else {
      setShowHeader(true);
    }
  }, [component, code, isMobileDevice]);


  // モバイル用ペーストボタン
  const handleMobilePaste = async () => {
    if (!navigator.clipboard) return;
    try {
      if (navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        setCode(text);
        compileAndSetComponent(text);
      } else if (navigator.clipboard.read) {
        // 画像やリッチデータ対応（必要なら拡張）
        const items = await navigator.clipboard.read();
        for (const item of items) {
          for (const type of item.types) {
            if (type === 'text/plain') {
              const blob = await item.getType(type);
              const text = await blob.text();
              setCode(text);
              compileAndSetComponent(text);
              return;
            }
          }
        }
      }
    } catch (e) {
      alert('ペーストに失敗しました');
    }
  };

  const noContent = !component && !code.trim()

  return (
    <div className="bg-white min-h-screen flex flex-col items-stretch" style={{ width: '100%', maxWidth: '100%', margin: 0, padding: 0 }}>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-3 right-3 z-50 px-3 py-2 rounded shadow text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      )}
      {/* ファイル名チップ（保存後/閲覧時） */}
      {currentId && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-40">
          {!editingTitle ? (
            <button
              className="px-3 py-1 text-xs rounded-full bg-black/70 text-white hover:bg-black/80"
              onClick={() => setEditingTitle(true)}
              title="クリックして名前を編集"
            >
              {currentTitle || 'Untitled'}
            </button>
          ) : (
            <input
              autoFocus
              defaultValue={currentTitle || ''}
              maxLength={200}
              className="px-2 py-1 text-xs rounded bg-white border border-gray-300 shadow min-w-[12rem]"
              onKeyDown={async (e) => {
                if (e.key === 'Escape') { setEditingTitle(false); return }
                if (e.key === 'Enter') {
                  const v = (e.currentTarget as HTMLInputElement).value.trim()
                  const newTitle = (v || 'Untitled').slice(0, 200)
                  try {
                    const r = await fetch(`/api/diagrams/${currentId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle }) })
                    if (r.ok) { setCurrentTitle(newTitle); showToast('success', '名称を更新しました') }
                    else { showToast('error', '更新に失敗しました') }
                  } catch { showToast('error', '更新に失敗しました') }
                  setEditingTitle(false)
                }
              }}
              onBlur={async (e) => {
                const v = e.currentTarget.value.trim()
                const newTitle = (v || 'Untitled').slice(0, 200)
                try {
                  const r = await fetch(`/api/diagrams/${currentId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle }) })
                  if (r.ok) { setCurrentTitle(newTitle); showToast('success', '名称を更新しました') }
                  else { showToast('error', '更新に失敗しました') }
                } catch { showToast('error', '更新に失敗しました') }
                setEditingTitle(false)
              }}
            />
          )}
        </div>
      )}
      {/* デスクトップ：帯（ヘッダー） */}
      {!isMobileDevice && showHeader && (
        <header
          className="flex justify-between items-center px-6 py-3 border-b border-gray-200 sticky top-0 bg-white z-10"
        >
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
            <button
              className="px-4 py-1.5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-md hover:opacity-90 transition-opacity text-sm"
              onClick={async () => {
                try {
                  // 画像生成（既存のプレビューDOMを利用）
                  await handleSaveDiagram()
                } catch (e) {
                  alert('Save failed')
                }
              }}
            >
              Save
            </button>
            <div className="hidden sm:block">
              <UserMenu />
            </div>
          </div>
        </header>
      )}
      {/* 最近の図解ストリップはWelcomeScreen内に配置（ここでは表示しない） */}
      {/* Main content */}
      <div className="flex flex-1 overflow-hidden" style={{ width: '100%', maxWidth: '100%' }}>
        {/* Code editor */}
        {showCode && !isMobileDevice && (
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
        <div className={`${showCode && !isMobileDevice ? 'w-1/2' : 'w-full'} flex flex-col overflow-hidden relative`}>
          {/* モバイル：右上にダウンロード＆ペーストボタン */}
          {isMobileDevice && (
            <div className="absolute top-2 right-2 flex gap-2 z-20 items-center">
              <UserMenu compact />
              <button
                className="p-2 bg-gradient-to-br from-cyan-500 to-sky-600 text-white rounded-full shadow hover:opacity-90"
                onClick={handleQuickShare}
                aria-label="クイック共有"
              >
                {lucideReact.ExternalLink && <lucideReact.ExternalLink size={22} />}
              </button>
              {!sharedView && (
                <button
                  className="p-2 bg-gradient-to-br from-cyan-500 to-sky-600 text-white rounded-full shadow hover:opacity-90"
                  onClick={async () => {
                    if (!currentId) return
                    try {
                      const r = await fetch(`/api/diagrams/${currentId}/share`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'enable' }) })
                      if (r.status === 401) { window.location.href = '/auth/google/login'; return }
                      if (!r.ok) { alert('共有リンクの作成に失敗しました'); return }
                      const j = await r.json()
                      setShareLink(j.shareUrl || null)
                      setShareExpiresAt(j.expiresAt ?? null)
                      setShareOpen(true)
                    } catch { alert('共有リンクの作成に失敗しました') }
                  }}
                  aria-label="共有"
                >
                  {lucideReact.Share2 && <lucideReact.Share2 size={22} />}
                </button>
              )}
              <button
                className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full shadow hover:opacity-90"
                onClick={handleDownloadPreview}
                aria-label="画像保存"
              >
                {lucideReact.Download && <lucideReact.Download size={24} />}
              </button>
              {!sharedView && (
              <button
                className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-full shadow hover:opacity-90"
                onClick={async () => { try { await handleSaveDiagram() } catch {} }}
                aria-label="保存"
              >
                {lucideReact.Save && <lucideReact.Save size={24} />}
              </button>
              )}
              {!sharedView && (
              <button
                className="p-2 bg-red-500 text-white rounded-full shadow hover:opacity-90"
                onClick={handleDeleteCurrent}
                aria-label="削除"
              >
                {lucideReact.Trash && <lucideReact.Trash size={22} />}
              </button>
              )}
              <button
                className="p-2 bg-white/80 backdrop-blur text-gray-700 rounded-full shadow hover:bg-white"
                onClick={handleClear}
                aria-label="クリア"
              >
                {lucideReact.X && <lucideReact.X size={22} />}
              </button>
              {canPaste && (
                <button
                  className="p-2 bg-gray-200 text-gray-700 rounded-full shadow hover:bg-gray-300"
                  onClick={handleMobilePaste}
                  aria-label="ペースト"
                >
                  <span className="text-lg font-bold">⎘</span>
                </button>
              )}
            </div>
          )}
          
          {/* デスクトップ：コンテンツがある場合の右上フローティングアイコン */}
          {!isMobileDevice && !showHeader && (component || code.trim()) && (
            <div className="absolute top-4 right-4 flex gap-2 z-20 items-center">
              <div className="hidden md:block">
                <UserMenu compact />
              </div>
              {/* Quick Share is always available (no login required) */}
              <button
                className="p-2 bg-white/70 backdrop-blur-sm text-cyan-700 rounded-full shadow-lg hover:bg-white/90 transition-all duration-200"
                onClick={handleQuickShare}
                aria-label="Quick Share"
              >
                {lucideReact.ExternalLink && <lucideReact.ExternalLink size={20} />}
              </button>
              {!sharedView && (
                <button
                  className="p-2 bg-white/70 backdrop-blur-sm text-gray-700 rounded-full shadow-lg hover:bg-white/90 transition-all duration-200"
                  onClick={async () => {
                    if (!currentId) return
                    try {
                      const r = await fetch(`/api/diagrams/${currentId}/share`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'enable' }) })
                      if (r.status === 401) { window.location.href = '/auth/google/login'; return }
                      if (!r.ok) { showToast('error', '共有リンク作成に失敗'); return }
                      const j = await r.json()
                      setShareLink(j.shareUrl || null)
                      setShareExpiresAt(j.expiresAt ?? null)
                      setShareOpen(true)
                    } catch { showToast('error', '共有リンク作成に失敗') }
                  }}
                  aria-label="Share"
                >
                  {lucideReact.Share2 && <lucideReact.Share2 size={20} />}
                </button>
              )}
              <button
                className="p-2 bg-white/70 backdrop-blur-sm text-gray-700 rounded-full shadow-lg hover:bg-white/90 transition-all duration-200"
                onClick={() => setShowCode(!showCode)}
                aria-label={showCode ? "Hide Code" : "Show Code"}
              >
                {lucideReact.Code && <lucideReact.Code size={20} />}
              </button>
              <button
                className="p-2 bg-white/70 backdrop-blur-sm text-gray-700 rounded-full shadow-lg hover:bg-white/90 transition-all duration-200"
                onClick={handleDownloadPreview}
                aria-label="Save as Image"
              >
                {lucideReact.Download && <lucideReact.Download size={20} />}
              </button>
              {!sharedView && (
              <button
                className="p-2 bg-white/70 backdrop-blur-sm text-gray-700 rounded-full shadow-lg hover:bg-white/90 transition-all duration-200"
                onClick={async () => { try { await handleSaveDiagram() } catch {} }}
                aria-label="Save"
              >
                {lucideReact.Save && <lucideReact.Save size={20} />}
              </button>
              )}
              {!sharedView && (
              <button
                className="p-2 bg-white/70 backdrop-blur-sm text-red-600 rounded-full shadow-lg hover:bg-white/90 transition-all duration-200"
                onClick={handleDeleteCurrent}
                aria-label="Delete"
              >
                {lucideReact.Trash && <lucideReact.Trash size={20} />}
              </button>
              )}
              <button
                className="p-2 bg-white/70 backdrop-blur-sm text-gray-700 rounded-full shadow-lg hover:bg-white/90 transition-all duration-200"
                onClick={handleClear}
                aria-label="Clear"
              >
                {lucideReact.X && <lucideReact.X size={20} />}
              </button>
        </div>
      )}

      {/* 共有期限切れの案内（ログインを促す） */}
          {sharedView && shareExpired && (
            <div className="absolute top-16 right-4 z-20">
              <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2 rounded-lg shadow">
                共有の有効期限が切れています。閲覧するにはログインしてください。
                <a href="/auth/google/login" className="inline-block ml-2 text-blue-600 underline">ログイン</a>
              </div>
            </div>
          )}
          {mode === 'html' ? (
            // HTMLモードのプレビュー
            <div className="flex-1 flex flex-col overflow-hidden bg-gray-50" style={{ height: 'calc(80vh - 100px)' }}>
              {code ? (
                <iframe
                  ref={htmlPreviewRef}
                  className="w-full h-full border-none"
                  srcDoc={iframeSrcDoc}
                  title="HTML Preview"
                  sandbox="allow-scripts allow-same-origin"
                ></iframe>
              ) : (
                <div className="h-full" />
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
                  <WelcomeScreen onLoadSample={loadSample} belowCta={<RecentDiagramStrip />} />
                )
              )}
            </div>
          )}

          {/* Share dialog */}
          <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} shareUrl={shareLink} expiresAt={shareExpiresAt || undefined} />
        </div>
      </div>
    </div>
  );
};

export default ComponentPreviewer;
