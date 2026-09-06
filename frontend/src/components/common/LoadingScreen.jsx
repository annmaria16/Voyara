import React from 'react';
import { Logo } from './Logo';

export const LoadingScreen = ({ message = 'Find Your Place.' }) => {
  return (
    <div className="min-h-screen bg-[#FFF8F0] dark:bg-[#0B1320] text-[#102A43] dark:text-slate-100 flex flex-col items-center justify-center p-6 text-center select-none transition-colors duration-200">
      <div className="space-y-6 flex flex-col items-center">
        <Logo size="lg" to={null} className="animate-pulse" />

        <div className="space-y-2">
          <div className="w-8 h-8 border-3 border-[#F97360] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold tracking-widest text-[#F97360] uppercase">
            {message}
          </p>
          <p className="text-[11px] text-slate-400 font-light">
            Stay. Explore. Experience.
          </p>
        </div>
      </div>
    </div>
  );
};
