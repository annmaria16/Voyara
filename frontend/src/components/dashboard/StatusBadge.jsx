import React from 'react';
import { ShieldCheck, AlertCircle, Clock, XCircle, CheckCircle2, AlertTriangle, Check } from 'lucide-react';

export const StatusBadge = ({ status, size = 'md' }) => {
  const normalized = (status || '').toUpperCase();

  const configs = {
    CONFIRMED: {
      label: 'Confirmed',
      classes: 'bg-[#DDF3E7] dark:bg-emerald-950/50 text-[#236C48] dark:text-emerald-300 border-[#35A66F]/40',
      icon: CheckCircle2,
    },
    VERIFIED: {
      label: 'Verified',
      classes: 'bg-[#DDF3E7] dark:bg-emerald-950/50 text-[#236C48] dark:text-emerald-300 border-[#35A66F]/40',
      icon: ShieldCheck,
    },
    AVAILABLE: {
      label: 'Available',
      classes: 'bg-[#DDF3E7] dark:bg-emerald-950/50 text-[#236C48] dark:text-emerald-300 border-[#35A66F]/40',
      icon: Check,
    },
    ACTIVE: {
      label: 'Active',
      classes: 'bg-[#DDF3E7] dark:bg-teal-950/50 text-[#087F8C] dark:text-[#27B7A8] border-[#087F8C]/40',
      icon: CheckCircle2,
    },
    PENDING: {
      label: 'Pending',
      classes: 'bg-orange-50 dark:bg-orange-950/50 text-[#EA580C] dark:text-orange-300 border-orange-400/40',
      icon: Clock,
    },
    NEEDS_REVIEW: {
      label: 'Needs Review',
      classes: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-400/40',
      icon: AlertTriangle,
    },
    UNDER_REVIEW: {
      label: 'Under Review',
      classes: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-400/40',
      icon: AlertTriangle,
    },
    WARNING: {
      label: 'Warning',
      classes: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-400/40',
      icon: AlertTriangle,
    },
    NO_SHOW: {
      label: 'Missed / No-Show',
      classes: 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-500/50',
      icon: AlertCircle,
    },
    MISSED: {
      label: 'Missed / No-Show',
      classes: 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-500/50',
      icon: AlertCircle,
    },
    CHECKIN_TODAY: {
      label: 'Check-in Today',
      classes: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-500/50',
      icon: Clock,
    },
    CHECKIN_MISSED: {
      label: 'Check-in Missed',
      classes: 'bg-orange-50 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border-orange-500/50',
      icon: AlertTriangle,
    },
    CHECKED_IN: {
      label: 'Checked In',
      classes: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-500/40',
      icon: CheckCircle2,
    },
    CHECKED_OUT: {
      label: 'Checked Out',
      classes: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-500/40',
      icon: CheckCircle2,
    },
    COMPLETED: {
      label: 'Completed',
      classes: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-500/40',
      icon: CheckCircle2,
    },
    FAILED: {
      label: 'Failed',
      classes: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-400/40',
      icon: AlertCircle,
    },
    CANCELLED: {
      label: 'Cancelled',
      classes: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-400/40',
      icon: XCircle,
    },
    REJECTED: {
      label: 'Rejected',
      classes: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-400/40',
      icon: XCircle,
    },
    INACTIVE: {
      label: 'Inactive',
      classes: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700',
      icon: Clock,
    },
  };

  const current = configs[normalized] || {
    label: status || 'Active',
    classes: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
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

