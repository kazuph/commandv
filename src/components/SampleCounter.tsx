import React, { useState } from 'react';

const SampleCounter: React.FC = () => {
  const [count, setCount] = useState(0);
  
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
          aria-label="Increase"
        >
          +
        </button>
      </div>
    </div>
  );
};

export default SampleCounter;
