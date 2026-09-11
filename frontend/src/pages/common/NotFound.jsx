import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../../components/common/Logo';
import { Compass, Home, LogIn, ArrowLeft } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-[#FFFDF7] dark:bg-[#091B29] text-[#091B29] dark:text-slate-100 flex flex-col items-center justify-center p-6 text-center select-none transition-colors duration-200">
      <div className="space-y-6 max-w-md w-full bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-8 sm:p-10 shadow-xl">
        <Logo size="lg" className="justify-center" />

        <div className="w-20 h-20 rounded-3xl bg-teal-500/10 dark:bg-teal-500/20 text-[#087F8C] dark:text-teal-400 flex items-center justify-center mx-auto shadow-inner">
          <Compass className="w-10 h-10 animate-spin" style={{ animationDuration: '10s' }} />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-black tracking-widest text-orange-500 uppercase">
            Error 404 — Page Not Found
          </span>
          <h1 className="text-2xl sm:text-3xl font-black font-serif text-[#091B29] dark:text-white">
            Lost on your journey?
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
            The destination you're looking for doesn't exist or has moved. Let's guide you back to discovering great stays.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
          <Link
            to="/"
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-[#EA580C] hover:from-orange-600 hover:to-[#c2410c] text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer group"
          >
            <Home className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
            <span>Back to Home</span>
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center space-x-1.5 px-5 py-2.5 bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200 dark:border-slate-800 text-[#091B29] dark:text-white text-xs font-bold rounded-xl shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5 text-slate-400" />
            <span>Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;

