import React from 'react';
import { Minus, Plus, AlertCircle } from 'lucide-react';

export const NumberStepperInput = ({
  label,
  icon: Icon,
  hint,
  value,
  onChange = () => {},
  min = 1,
  max = 100,
  step = 1,
  error = '',
  required = false,
  className = '',
  id,
  name,
}) => {
  // Convert current value to numeric if possible for stepper buttons
  const numericValue = typeof value === 'number' ? value : parseInt(value, 10);
  const isValidNumber = !isNaN(numericValue);

  const handleDecrement = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const current = isValidNumber ? numericValue : min;
    const nextVal = Math.max(0, current - step);
    onChange(nextVal);
  };

  const handleIncrement = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const current = isValidNumber ? numericValue : 0;
    const nextVal = Math.min(max, current + step);
    onChange(nextVal);
  };

  const handleInputChange = (e) => {
    const raw = e.target.value;
    // Allow empty string so user can clear and type freely
    if (raw === '') {
      onChange('');
      return;
    }
    // Only accept numeric inputs
    const cleaned = raw.replace(/\D/g, '');
    if (cleaned === '') {
      onChange('');
      return;
    }
    const num = parseInt(cleaned, 10);
    onChange(num);
  };

  const hasError = Boolean(error);

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Label and Required marker */}
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between"
        >
          <span className="flex items-center space-x-1.5">
            {Icon && <Icon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
            <span>{label} {required && <span className="text-rose-500">*</span>}</span>
          </span>
          {hint && (
            <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
              {hint}
            </span>
          )}
        </label>
      )}

      {/* Stepper Control Box */}
      <div
        className={`flex items-center rounded-2xl border transition-all overflow-hidden ${
          hasError
            ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 dark:bg-rose-950/20'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20'
        }`}
      >
        {/* Decrease Button (-) */}
        <button
          type="button"
          onClick={handleDecrement}
          disabled={isValidNumber && numericValue <= 0}
          className="w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors shrink-0 cursor-pointer border-r border-slate-100 dark:border-slate-800/80"
          title={`Decrease (min: 0)`}
          aria-label={`Decrease ${label || 'value'}`}
        >
          <Minus className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Direct Type Input */}
        <input
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value === undefined || value === null ? '' : value}
          onChange={handleInputChange}
          placeholder="0"
          className="w-full text-center font-bold text-sm text-slate-900 dark:text-white bg-transparent py-2.5 px-2 focus:outline-hidden"
        />

        {/* Increase Button (+) */}
        <button
          type="button"
          onClick={handleIncrement}
          disabled={isValidNumber && numericValue >= max}
          className="w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors shrink-0 cursor-pointer border-l border-slate-100 dark:border-slate-800/80"
          title={`Increase (max: ${max})`}
          aria-label={`Increase ${label || 'value'}`}
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Live Validation Error Message */}
      {hasError && (
        <p className="text-[11px] font-semibold text-rose-500 flex items-center space-x-1 pt-0.5 animate-fadeIn">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};

export default NumberStepperInput;
