import React from 'react';
import { ShieldCheck, AlertTriangle, XCircle, Info } from 'lucide-react';

export const VerificationBadge = ({ status = 'VERIFIED', size = 'md', onClick, showDetailsHint = false }) => {
  const normStatus = (status || 'VERIFIED').toUpperCase();

  const getStyle = () => {
    switch (normStatus) {
      case 'VERIFIED':
        return {
          bg: 'bg-[#DDF3E7] text-[#236C48] dark:bg-emerald-950/60 dark:text-emerald-300 border-[#35A66F]/40 hover:bg-[#cdeedc]',
          icon: <ShieldCheck className={size === 'sm' ? 'w-3.5 h-3.5 text-[#35A66F]' : 'w-4 h-4 text-[#35A66F]'} />,
          label: 'Voyara Verified Stay',
          dot: 'bg-[#35A66F]',
          explanation: "This property has passed Voyara's platform verification and administrative review.",
        };
      case 'NEEDS_REVIEW':
        return {
          bg: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-400/40 hover:bg-amber-100',
          icon: <AlertTriangle className={size === 'sm' ? 'w-3.5 h-3.5 text-[#F6C945]' : 'w-4 h-4 text-[#F6C945]'} />,
          label: 'Voyara Review Pending',
          dot: 'bg-[#F6C945]',
          explanation: 'This property is undergoing consistency review.',
        };
      case 'FAILED':
      case 'REJECTED':
        return {
          bg: 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border-rose-400/40 hover:bg-rose-100',
          icon: <XCircle className={size === 'sm' ? 'w-3.5 h-3.5 text-rose-500' : 'w-4 h-4 text-rose-500'} />,
          label: 'Unverified',
          dot: 'bg-rose-500',
          explanation: 'This property has not passed platform verification.',
        };
      default:
        return {
          bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
          icon: <Info className="w-4 h-4 text-slate-400" />,
          label: 'Pending Review',
          dot: 'bg-slate-400',
          explanation: 'Verification in progress.',
        };
    }
  };

  const style = getStyle();

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      title={style.explanation}
      className={`inline-flex items-center gap-1.5 font-bold border rounded-full transition-all duration-200 ${style.bg} ${
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
      <span className="font-semibold tracking-tight">{normStatus === 'VERIFIED' ? '✓ ' : ''}{style.label}</span>
      {showDetailsHint && onClick && <span className="text-[10px] opacity-75 underline ml-1">Inspect</span>}
    </button>
  );
};

