import React from 'react';

interface JudoLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
  text?: string;
  className?: string;
}

export default function JudoLoader({ size = 'md', text = 'جاري التحميل...', className = '' }: JudoLoaderProps) {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    fullscreen: 'w-20 h-20',
  };

  const currentSize = sizeMap[size];

  const content = (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      <div className={`relative ${currentSize} drop-shadow-lg animate-pulse`}>
        {/* Actual Saudi Judo Logo */}
        <img 
          src="/logo.png" 
          alt="Loading..." 
          className="w-full h-full object-contain"
        />
      </div>
      
      {text && (
        <span className="text-gray-600 font-bold text-sm tracking-widest animate-pulse whitespace-nowrap">
          {text}
        </span>
      )}
    </div>
  );

  if (size === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}
