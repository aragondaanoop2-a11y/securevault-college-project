import React from 'react';

export const Sparkles: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`absolute top-2.5 right-3 pointer-events-none select-none flex items-center gap-1.5 opacity-70 ${className}`}>
      {/* 4-point sparkle star large */}
      <svg className="w-3.5 h-3.5 text-white/80 animate-sparkle" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
      </svg>
      {/* 4-point sparkle star small */}
      <svg className="w-2 h-2 text-white/60 animate-sparkle [animation-delay:1.2s]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
      </svg>
      <div className="w-1 h-1 rounded-full bg-white/50 animate-ping-slow"></div>
    </div>
  );
};
