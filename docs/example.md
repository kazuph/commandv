# サンプルコンポーネント

以下のコンポーネントをコピーして、Claude Artifact Previewerで試してみてください。

## 1. 基本的なカウンターコンポーネント

```jsx
import React, { useState } from 'react';

const Component = () => {
  const [count, setCount] = useState(0);
  
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>シンプルなカウンター</h2>
      <p>現在のカウント: {count}</p>
      <button 
        onClick={() => setCount(count + 1)}
        style={{ 
          background: '#4CAF50', 
          color: 'white', 
          padding: '10px 15px',
          border: 'none',
          borderRadius: '4px',
          margin: '5px'
        }}
      >
        増加
      </button>
      <button 
        onClick={() => setCount(count - 1)}
        style={{ 
          background: '#f44336', 
          color: 'white', 
          padding: '10px 15px',
          border: 'none',
          borderRadius: '4px',
          margin: '5px'
        }}
      >
        減少
      </button>
    </div>
  );
};
```

## 2. Rechartsを使用したグラフコンポーネント

```jsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const data = [
  { name: '1月', 売上: 4000, 利益: 2400 },
  { name: '2月', 売上: 3000, 利益: 1398 },
  { name: '3月', 売上: 9800, 利益: 2000 },
  { name: '4月', 売上: 3908, 利益: 2780 },
  { name: '5月', 売上: 4800, 利益: 1890 },
  { name: '6月', 売上: 3800, 利益: 2390 },
  { name: '7月', 売上: 4300, 利益: 3490 },
];

const Component = () => {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>月間売上/利益グラフ</h2>
      <LineChart
        width={500}
        height={300}
        data={data}
        margin={{
          top: 5, right: 30, left: 20, bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="売上" stroke="#8884d8" activeDot={{ r: 8 }} />
        <Line type="monotone" dataKey="利益" stroke="#82ca9d" />
      </LineChart>
    </div>
  );
};
```

## 3. React Iconsを使用したUIコンポーネント

```jsx
import React, { useState } from 'react';
import { FaHome, FaUser, FaCog, FaBell, FaStar, FaHeart, FaThumbsUp } from 'react-icons/fa';

const Component = () => {
  const [selectedIcon, setSelectedIcon] = useState(null);
  
  const iconData = [
    { icon: FaHome, name: 'ホーム', color: '#3498db' },
    { icon: FaUser, name: 'ユーザー', color: '#2ecc71' },
    { icon: FaCog, name: '設定', color: '#e74c3c' },
    { icon: FaBell, name: '通知', color: '#f39c12' },
    { icon: FaStar, name: 'お気に入り', color: '#9b59b6' },
    { icon: FaHeart, name: 'いいね', color: '#e84393' },
    { icon: FaThumbsUp, name: '賛成', color: '#00cec9' }
  ];
  
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>アイコンギャラリー</h2>
      <p>アイコンをクリックして選択してください</p>
      
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        {iconData.map((item, index) => (
          <div 
            key={index}
            onClick={() => setSelectedIcon(item)}
            style={{ 
              padding: '10px', 
              margin: '5px',
              cursor: 'pointer',
              backgroundColor: selectedIcon === item ? '#f0f0f0' : 'transparent',
              borderRadius: '5px'
            }}
          >
            <item.icon size={30} color={item.color} />
          </div>
        ))}
      </div>
      
      {selectedIcon && (
        <div style={{ marginTop: '20px' }}>
          <h3>選択されたアイコン:</h3>
          <div style={{ fontSize: '48px', margin: '10px' }}>
            <selectedIcon.icon size={80} color={selectedIcon.color} />
          </div>
          <p>{selectedIcon.name}</p>
        </div>
      )}
    </div>
  );
};
```

## 4. Tailwind CSSを使用したカードコンポーネント

```jsx
import React from 'react';

const Component = () => {
  const cards = [
    {
      title: 'チームコラボレーション',
      description: 'チームの効率を向上させるためのツールやテクニック',
      icon: '👥'
    },
    {
      title: 'データ分析',
      description: 'データからインサイトを導き出す方法',
      icon: '📊'
    },
    {
      title: 'クラウドサービス',
      description: 'モダンなクラウドテクノロジーの活用方法',
      icon: '☁️'
    }
  ];

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-center mb-6">サービス一覧</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div className="p-5">
              <div className="text-center text-4xl mb-3">{card.icon}</div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">{card.title}</h3>
              <p className="text-gray-600">{card.description}</p>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200">
              <button className="w-full text-blue-500 hover:text-blue-700 font-medium">
                詳細を見る
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
