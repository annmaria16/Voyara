import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../../components/common/Logo';
import { Compass, ArrowLeft, Home } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-[#FFF8F0] dark:bg-[#0B1320] text-[#102A43] dark:text-slate-100 flex flex-col items-center justify-center p-6 text-center select-none transition-colors duration-200">
      <div className="space-y-6 max-w-md">
        <Logo size="lg" className="justify-center" />

        <div className="w-20 h-20 rounded-3xl bg-[#F97360]/10 text-[#F97360] flex items-center justify-center mx-auto shadow-inner">
          <Compass className="w-10 h-10 animate-spin" style={{ animationDuration: '8s' }} />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-black tracking-widest text-[#F97360] uppercase">
            Error 404 — Page Not Found
          </span>
          <h1 className="text-2xl sm:text-3xl font-black font-serif text-[#102A43] dark:text-white">
            Lost on your journey?
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-light leading-relaxed">
            The page you're looking for doesn't exist or has been moved. Let's get you back to discovering great stays.
          </p>
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <Link
            to="/"
            className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-[#F97360] hover:bg-[#e05e4b] text-white text-xs font-bold rounded-xl shadow-xs transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-white dark:bg-[#131D2E] border border-slate-200 dark:border-slate-800 text-[#102A43] dark:text-white text-xs font-bold rounded-xl shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            <span>Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
