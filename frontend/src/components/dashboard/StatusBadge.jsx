import React from 'react';
import { ShieldCheck, AlertCircle, Clock, XCircle, CheckCircle2 } from 'lucide-react';

export const StatusBadge = ({ status, size = 'md' }) => {
  const normalized = (status || '').toUpperCase();

  const configs = {
    CONFIRMED: {
      label: 'Confirmed',
      classes: 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
      icon: CheckCircle2,
    },
    VERIFIED: {
      label: 'Verified',
      classes: 'bg-teal-500/10 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30',
      icon: ShieldCheck,
    },
    PENDING: {
      label: 'Pending',
      classes: 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
      icon: Clock,
    },
    CANCELLED: {
      label: 'Cancelled',
      classes: 'bg-rose-500/10 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
      icon: XCircle,
    },
    FAILED: {
      label: 'Failed',
      classes: 'bg-rose-500/10 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
      icon: AlertCircle,
    },
    NEEDS_REVIEW: {
      label: 'Under Review',
      classes: 'bg-orange-500/10 dark:bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
      icon: AlertCircle,
    },
  };

  const current = configs[normalized] || {
    label: status || 'Active',
    classes: 'bg-slate-500/10 dark:bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-400/30 dark:border-slate-600/30',
    icon: CheckCircle2,
  };

  const Icon = current.icon;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold rounded-full border font-sans tracking-wide ${sizeClasses} ${current.classes}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{current.label}</span>
    </span>
  );
};
