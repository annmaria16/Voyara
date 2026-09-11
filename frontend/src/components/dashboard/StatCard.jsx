import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export const StatCard = ({
  title,
  value,
  change,
  changeType = 'increase',
  icon: Icon,
  accentColor = 'teal', // 'teal' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple'
  variant = 'pastel', // 'pastel' | 'solid-gradient' | 'standard'
}) => {
  const isIncrease = changeType === 'increase' || (typeof change === 'string' && change.includes('+'));
  const isNeutral = changeType === 'neutral' || (typeof change === 'string' && !change.includes('%'));

  // 1. SOLID GRADIENT VARIANT (Used for punchy Admin stats in both Light & Dark modes)
  if (variant === 'solid-gradient') {
    const solidGradients = {
      teal: 'bg-gradient-to-br from-[#087F8C] to-[#0F9D9A] text-white shadow-lg shadow-teal-500/25 border-teal-400/30',
      emerald: 'bg-gradient-to-br from-[#35A66F] to-[#2E8B5D] text-white shadow-lg shadow-emerald-500/25 border-emerald-400/30',
      green: 'bg-gradient-to-br from-[#35A66F] to-[#2E8B5D] text-white shadow-lg shadow-emerald-500/25 border-emerald-400/30',
      blue: 'bg-gradient-to-br from-[#087F8C] to-[#0284C7] text-white shadow-lg shadow-sky-500/25 border-cyan-400/30',
      orange: 'bg-gradient-to-br from-orange-500 to-[#EA580C] text-white shadow-lg shadow-orange-500/25 border-orange-400/30',
      yellow: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25 border-amber-400/30',
      coral: 'bg-gradient-to-br from-orange-500 to-[#EA580C] text-white shadow-lg shadow-orange-500/25 border-orange-400/30',
      purple: 'bg-gradient-to-br from-[#6C5CE7] to-[#8E44AD] text-white shadow-lg shadow-purple-500/25 border-purple-400/30',
    };

    return (
      <div
        className={`rounded-3xl p-5 sm:p-6 border transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between ${
          solidGradients[accentColor] || solidGradients.teal
        }`}
      >
        <div className="flex items-start justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-white/95 font-sans">
            {title}
          </p>
          {Icon && (
            <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0 shadow-xs">
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>

        <div className="mt-4">
          <h3 className="text-2xl sm:text-3xl font-black font-serif text-white tracking-tight">
            {value}
          </h3>

          {change && (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-white/95">
              {!isNeutral && isIncrease && (
                <span className="inline-flex items-center font-bold bg-white/25 px-2.5 py-0.5 rounded-full text-[11px]">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {change}
                </span>
              )}
              {!isNeutral && !isIncrease && (
                <span className="inline-flex items-center font-bold bg-black/25 px-2.5 py-0.5 rounded-full text-[11px]">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  {change}
                </span>
              )}
              {isNeutral && <span className="text-white/90 text-xs">{change}</span>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. PASTEL & GLOW VARIANT (Soft pastel in Light mode, glowing card in Dark mode)
  if (variant === 'pastel') {
    const pastelStyles = {
      teal: {
        container:
          'bg-gradient-to-br from-[#E6F7F7] via-[#F0FDFD] to-[#D1F2F2] dark:from-[#091B29] dark:via-[#0F273D] dark:to-[#081B26] border-teal-200 dark:border-teal-500/40 shadow-xs dark:shadow-lg dark:shadow-teal-950/40',
        title: 'text-[#087F8C] dark:text-teal-300 font-bold',
        number: 'text-[#065A63] dark:text-teal-200',
        iconBg: 'bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] text-white shadow-xs',
        badge: 'bg-teal-500/15 text-[#087F8C] dark:text-teal-300',
      },
      emerald: {
        container:
          'bg-gradient-to-br from-[#E6F7F2] via-[#F0FDF8] to-[#D1F2E8] dark:from-[#091B29] dark:via-[#0E2822] dark:to-[#091B29] border-emerald-200 dark:border-emerald-500/40 shadow-xs dark:shadow-lg dark:shadow-emerald-950/40',
        title: 'text-[#2E8B5D] dark:text-emerald-300 font-bold',
        number: 'text-[#1E6B45] dark:text-emerald-200',
        iconBg: 'bg-emerald-600 text-white shadow-xs',
        badge: 'bg-emerald-500/15 text-[#2E8B5D] dark:text-emerald-300',
      },
      blue: {
        container:
          'bg-gradient-to-br from-[#E6F4FB] via-[#F0F9FF] to-[#D1ECF9] dark:from-[#091B29] dark:via-[#0F273D] dark:to-[#091B29] border-sky-200 dark:border-cyan-500/40 shadow-xs dark:shadow-lg dark:shadow-sky-950/40',
        title: 'text-[#087F8C] dark:text-cyan-300 font-bold',
        number: 'text-[#065A63] dark:text-cyan-200',
        iconBg: 'bg-[#087F8C] text-white shadow-xs',
        badge: 'bg-[#087F8C]/15 text-[#087F8C] dark:text-cyan-300',
      },
      orange: {
        container:
          'bg-gradient-to-br from-[#FFF5EE] via-[#FFFDF7] to-[#FFE8D6] dark:from-[#1C120C] dark:via-[#26180F] dark:to-[#140C08] border-orange-200 dark:border-orange-500/40 shadow-xs dark:shadow-lg dark:shadow-orange-950/40',
        title: 'text-orange-700 dark:text-orange-300 font-bold',
        number: 'text-orange-900 dark:text-orange-200',
        iconBg: 'bg-gradient-to-r from-orange-500 to-[#EA580C] text-white shadow-xs',
        badge: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
      },
      coral: {
        container:
          'bg-gradient-to-br from-[#FFF5EE] via-[#FFFDF7] to-[#FFE8D6] dark:from-[#1C120C] dark:via-[#26180F] dark:to-[#140C08] border-orange-200 dark:border-orange-500/40 shadow-xs dark:shadow-lg dark:shadow-orange-950/40',
        title: 'text-orange-700 dark:text-orange-300 font-bold',
        number: 'text-orange-900 dark:text-orange-200',
        iconBg: 'bg-gradient-to-r from-orange-500 to-[#EA580C] text-white shadow-xs',
        badge: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
      },
      purple: {
        container:
          'bg-gradient-to-br from-[#F3E8FF] via-[#FAF5FF] to-[#E9D5FF] dark:from-[#1E1430] dark:via-[#26183D] dark:to-[#170E26] border-[#D8B4FE] dark:border-purple-500/40 shadow-xs dark:shadow-lg dark:shadow-purple-950/40',
        title: 'text-[#7E22CE] dark:text-purple-300 font-bold',
        number: 'text-[#6B21A8] dark:text-[#C084FC]',
        iconBg: 'bg-[#9333EA] text-white shadow-xs',
        badge: 'bg-[#9333EA]/15 text-[#7E22CE] dark:text-purple-300',
      },
    };

    const scheme = pastelStyles[accentColor] || pastelStyles.teal || pastelStyles.emerald;

    return (
      <div
        className={`rounded-3xl p-5 sm:p-6 border transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between group ${scheme.container}`}
      >
        <div className="flex items-start justify-between">
          <p className={`text-xs font-bold uppercase tracking-wider font-sans ${scheme.title}`}>
            {title}
          </p>
          {Icon && (
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-xs ${scheme.iconBg}`}
            >
              <Icon className="w-5 h-5" />
            </div>
          )}
        </div>

        <div className="mt-3">
          <h3 className={`text-2xl sm:text-3xl font-black font-serif tracking-tight ${scheme.number}`}>
            {value}
          </h3>

          {change && (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold">
              {!isNeutral && isIncrease && (
                <span className={`inline-flex items-center font-bold px-2.5 py-0.5 rounded-full text-[11px] ${scheme.badge}`}>
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {change}
                </span>
              )}
              {!isNeutral && !isIncrease && (
                <span className="inline-flex items-center font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 px-2.5 py-0.5 rounded-full text-[11px]">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  {change}
                </span>
              )}
              {isNeutral && (
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${scheme.badge}`}>
                  {change}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. STANDARD SLEEK CARD
  const standardAccents = {
    teal: 'bg-teal-500/15 text-[#087F8C] dark:text-teal-400 border-teal-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    blue: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    orange: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
    coral: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
    purple: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  };

  return (
    <div className="bg-white dark:bg-[#0F273D] hover:border-teal-500/40 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl transition-all duration-200 group flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-sans">
          {title}
        </p>
        {Icon && (
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-transform duration-200 group-hover:scale-105 ${
              standardAccents[accentColor] || standardAccents.teal
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <h3 className="text-2xl sm:text-3xl font-black font-serif text-[#091B29] dark:text-white tracking-tight">
          {value}
        </h3>

        {change && (
          <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold">
            {!isNeutral && isIncrease && (
              <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-bold">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                {change}
              </span>
            )}
            {!isNeutral && !isIncrease && (
              <span className="inline-flex items-center text-rose-600 dark:text-rose-400 font-bold">
                <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                {change}
              </span>
            )}
            {isNeutral && (
              <span className="text-slate-500 dark:text-slate-400 text-xs">{change}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;


