import React from 'react';
import AppleLogo from './AppleLogo';

interface WelcomeScreenProps {
  onLoadSample: () => void;
  belowCta?: React.ReactNode; // CTA直下に差し込む領域（最近の図解など）
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onLoadSample, belowCta }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full py-8 pb-24">
      <div className="mb-6">
        <AppleLogo />
      </div>
      
      <h1 className="text-4xl font-light mb-4 tracking-tight">CommandV</h1>
      
      <div className="text-xl text-gray-600 mb-8 font-light text-center max-w-md">
        Preview Claude Artifacts instantly with a simple paste
      </div>
      
      <div className="text-3xl font-light mb-10 tracking-tight">
        Just paste it!
      </div>
      
      <button 
        onClick={onLoadSample}
        className="px-8 py-3 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full hover:opacity-90 transition-opacity water-gradient"
        style={{
          background: 'linear-gradient(to bottom right, #3b82f6, #4f46e5)'
        }}
      >
        View Sample
      </button>
      {belowCta && (
        <div className="mt-6 w-full max-w-6xl px-4">
          {belowCta}
        </div>
      )}
      <div className="mt-8 text-xs text-gray-400">
        Paste your component code anywhere to preview
      </div>
    </div>
  );
};

export default WelcomeScreen;
