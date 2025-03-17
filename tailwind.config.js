/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  safelist: [
    // グラデーション関連
    'bg-gradient-to-br',
    'bg-gradient-to-r',
    'bg-gradient-to-b',
    
    // from-色 クラス
    'from-cyan-300',
    'from-cyan-400',
    'from-cyan-500',
    'from-cyan-600',
    'from-blue-300',
    'from-blue-400',
    'from-blue-500',
    'from-blue-600',
    'from-indigo-300',
    'from-indigo-400',
    'from-indigo-500',
    'from-indigo-600',
    
    // to-色 クラス
    'to-cyan-300',
    'to-cyan-400',
    'to-cyan-500',
    'to-cyan-600',
    'to-blue-300',
    'to-blue-400',
    'to-blue-500',
    'to-blue-600',
    'to-indigo-300',
    'to-indigo-400',
    'to-indigo-500',
    'to-indigo-600',
    
    // 背景色
    'bg-cyan-300',
    'bg-cyan-400',
    'bg-cyan-500',
    'bg-cyan-600',
    'bg-blue-300',
    'bg-blue-400',
    'bg-blue-500',
    'bg-blue-600',
    
    // テキスト色
    'text-cyan-300',
    'text-cyan-400',
    'text-cyan-500',
    'text-cyan-600',
    'text-blue-300',
    'text-blue-400',
    'text-blue-500',
    'text-blue-600',
    
    // ボーダー色
    'border-cyan-300',
    'border-cyan-400',
    'border-cyan-500',
    'border-cyan-600',
    'border-blue-300',
    'border-blue-400',
    'border-blue-500',
    'border-blue-600',
    
    // パターンによる網羅
    {
      pattern: /(from|to|bg|text|border)-(blue|cyan|indigo|sky)-(300|400|500|600)/,
      variants: ['hover', 'focus', 'active'],
    },
  ],
}
