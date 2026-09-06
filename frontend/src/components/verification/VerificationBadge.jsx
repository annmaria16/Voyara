import React from 'react';
import { ShieldCheck, AlertTriangle, XCircle, Info } from 'lucide-react';

export const VerificationBadge = ({ status = 'VERIFIED', size = 'md', onClick, showDetailsHint = false }) => {
  const normStatus = (status || 'VERIFIED').toUpperCase();

  const getStyle = () => {
    switch (normStatus) {
      case 'VERIFIED':
        return {
          bg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25',
          icon: <ShieldCheck className={size === 'sm' ? 'w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400' : 'w-4 h-4 text-emerald-600 dark:text-emerald-400'} />,
          label: 'VeriNova Verified',
          dot: 'bg-emerald-500',
        };
      case 'NEEDS_REVIEW':
        return {
          bg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/25',
          icon: <AlertTriangle className={size === 'sm' ? 'w-3.5 h-3.5 text-amber-500' : 'w-4 h-4 text-amber-500'} />,
          label: 'VeriNova Needs Review',
          dot: 'bg-amber-500',
        };
      case 'FAILED':
        return {
          bg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/25',
          icon: <XCircle className={size === 'sm' ? 'w-3.5 h-3.5 text-rose-500' : 'w-4 h-4 text-rose-500'} />,
          label: 'VeriNova Failed',
          dot: 'bg-rose-500',
        };
      default:
        return {
          bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
          icon: <Info className="w-4 h-4 text-slate-400" />,
          label: 'VeriNova Pending',
          dot: 'bg-slate-400',
        };
    }
  };

  const style = getStyle();

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`inline-flex items-center gap-1.5 font-medium border rounded-full transition-all duration-200 ${style.bg} ${
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-xs sm:text-sm'
      } ${onClick ? 'cursor-pointer shadow-xs hover:scale-102' : 'cursor-default'}`}
    >
      <span className="relative flex h-2 w-2">
        {normStatus === 'VERIFIED' && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${style.dot}`}></span>
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${style.dot}`}></span>
      </span>
      {style.icon}
      <span className="font-semibold tracking-tight">{style.label}</span>
      {showDetailsHint && onClick && <span className="text-[10px] opacity-75 underline ml-1">Inspect</span>}
    </button>
  );
};
