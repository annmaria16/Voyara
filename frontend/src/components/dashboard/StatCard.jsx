import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export const StatCard = ({
  title,
  value,
  change,
  changeType = 'increase',
  icon: Icon,
  accentColor = 'emerald', // 'emerald' | 'blue' | 'orange' | 'coral' | 'purple'
  variant = 'pastel', // 'pastel' | 'solid-gradient' | 'standard'
}) => {
  const isIncrease = changeType === 'increase' || (typeof change === 'string' && change.includes('+'));
  const isNeutral = changeType === 'neutral' || (typeof change === 'string' && !change.includes('%'));

  // 1. SOLID GRADIENT VARIANT (Used for punchy Admin stats in both Light & Dark modes)
  if (variant === 'solid-gradient') {
    const solidGradients = {
      emerald: 'bg-gradient-to-br from-[#00B894] to-[#00A885] text-white shadow-lg shadow-emerald-500/25 border-emerald-400/30',
      blue: 'bg-gradient-to-br from-[#0984E3] to-[#2E86DE] text-white shadow-lg shadow-blue-500/25 border-blue-400/30',
      orange: 'bg-gradient-to-br from-[#F97360] to-[#E65100] text-white shadow-lg shadow-orange-500/25 border-orange-400/30',
      coral: 'bg-gradient-to-br from-[#FF7675] to-[#F97360] text-white shadow-lg shadow-rose-500/25 border-rose-400/30',
      purple: 'bg-gradient-to-br from-[#6C5CE7] to-[#8E44AD] text-white shadow-lg shadow-purple-500/25 border-purple-400/30',
    };

    return (
      <div
        className={`rounded-2xl p-5 border transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between ${
          solidGradients[accentColor] || solidGradients.emerald
        }`}
      >
        <div className="flex items-start justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-white/95 font-sans">
            {title}
          </p>
          {Icon && (
            <div className="w-8 h-8 rounded-xl bg-white/25 backdrop-blur-xs flex items-center justify-center text-white shrink-0">
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

  // 2. PASTEL & GLOW VARIANT (Soft pastel in Light mode, glowing neon border card in Dark mode)
  if (variant === 'pastel') {
    const pastelStyles = {
      emerald: {
        container:
          'bg-gradient-to-br from-[#E6F7F2] via-[#F0FDF8] to-[#D1F2E8] dark:from-[#0C1E28] dark:via-[#112433] dark:to-[#0B1A24] border-[#A7E8D4] dark:border-emerald-500/40 shadow-xs dark:shadow-lg dark:shadow-emerald-950/40',
        title: 'text-[#0D7A5F] dark:text-emerald-300 font-bold',
        number: 'text-[#0A5D48] dark:text-[#34D399]',
        iconBg: 'bg-[#10B981] text-white shadow-xs',
        badge: 'bg-[#10B981]/15 text-[#0D7A5F] dark:text-emerald-300',
      },
      blue: {
        container:
          'bg-gradient-to-br from-[#E6F4FB] via-[#F0F9FF] to-[#D1ECF9] dark:from-[#0C2032] dark:via-[#10273D] dark:to-[#0A1A2A] border-[#A8DDF7] dark:border-cyan-500/40 shadow-xs dark:shadow-lg dark:shadow-sky-950/40',
        title: 'text-[#0A6C9E] dark:text-cyan-300 font-bold',
        number: 'text-[#08557D] dark:text-[#38BDF8]',
        iconBg: 'bg-[#0284C7] text-white shadow-xs',
        badge: 'bg-[#0284C7]/15 text-[#0A6C9E] dark:text-cyan-300',
      },
      orange: {
        container:
          'bg-gradient-to-br from-[#FFEFEA] via-[#FFF6F2] to-[#FFE0D6] dark:from-[#231818] dark:via-[#2C1D1D] dark:to-[#1C1212] border-[#FFC2B0] dark:border-orange-500/40 shadow-xs dark:shadow-lg dark:shadow-orange-950/40',
        title: 'text-[#C84928] dark:text-orange-300 font-bold',
        number: 'text-[#A8371B] dark:text-[#FB923C]',
        iconBg: 'bg-gradient-to-r from-[#F97360] to-[#E65100] text-white shadow-xs',
        badge: 'bg-[#F97360]/15 text-[#C84928] dark:text-orange-300',
      },
      coral: {
        container:
          'bg-gradient-to-br from-[#FFF0F5] via-[#FFF5F8] to-[#FFE0EB] dark:from-[#23121E] dark:via-[#2D1627] dark:to-[#1C0D17] border-[#FFC2D6] dark:border-rose-500/40 shadow-xs dark:shadow-lg dark:shadow-rose-950/40',
        title: 'text-[#B82B5A] dark:text-rose-300 font-bold',
        number: 'text-[#961E46] dark:text-[#F472B6]',
        iconBg: 'bg-[#E11D48] text-white shadow-xs',
        badge: 'bg-[#E11D48]/15 text-[#B82B5A] dark:text-rose-300',
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

    const scheme = pastelStyles[accentColor] || pastelStyles.emerald;

    return (
      <div
        className={`rounded-2xl p-5 border transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between group ${scheme.container}`}
      >
        <div className="flex items-start justify-between">
          <p className={`text-xs font-bold uppercase tracking-wider font-sans ${scheme.title}`}>
            {title}
          </p>
          {Icon && (
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${scheme.iconBg}`}
            >
              <Icon className="w-4 h-4" />
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
                <span className={`inline-flex items-center font-bold px-2 py-0.5 rounded-full text-[11px] ${scheme.badge}`}>
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {change}
                </span>
              )}
              {!isNeutral && !isIncrease && (
                <span className="inline-flex items-center font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full text-[11px]">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  {change}
                </span>
              )}
              {isNeutral && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scheme.badge}`}>
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
    emerald: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    blue: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    orange: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
    coral: 'bg-[#F97360]/15 text-[#F97360] border-[#F97360]/30',
    purple: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  };

  return (
    <div className="bg-white dark:bg-[#131D2E] hover:border-slate-300 dark:hover:border-slate-700 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs dark:shadow-xl transition-all duration-200 group flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-sans">
          {title}
        </p>
        {Icon && (
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-transform duration-200 group-hover:scale-105 ${
              standardAccents[accentColor] || standardAccents.emerald
            }`}
          >
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <h3 className="text-2xl sm:text-3xl font-black font-serif text-[#102A43] dark:text-white tracking-tight">
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

