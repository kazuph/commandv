import React from 'react';

// Modern Apple-style logo for Claude ⌘V
const AppleLogo: React.FC = () => {
  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      {/* Gradient background circle */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 shadow-lg"></div>
      
      {/* ⌘V text */}
      <span className="relative font-bold text-lg text-white">⌘V</span>
      
      {/* Animated pulse effect */}
      <div className="absolute inset-0 rounded-full bg-white opacity-20 animate-ping"></div>
    </div>
  );
};

export default AppleLogo;
