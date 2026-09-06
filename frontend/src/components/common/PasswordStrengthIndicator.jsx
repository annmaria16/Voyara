import React from 'react';
import { Check } from 'lucide-react';

export const PasswordStrengthIndicator = ({ password = '' }) => {
  const rules = [
    { label: 'At least 6 characters', valid: password.length >= 6 },
    { label: 'One uppercase letter', valid: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', valid: /[a-z]/.test(password) },
    { label: 'One number', valid: /[0-9]/.test(password) },
    { label: 'One special character', valid: /[!@#$%^&*(),.?":{}|<>\-_=+[\]/\\~`';]/.test(password) },
  ];

  return (
    <div className="space-y-2 text-xs py-1">
      <span className="block font-medium text-gray-500 text-[11px]">
        Password must contain:
      </span>

      <div className="space-y-1.5 pl-0.5">
        {rules.map((rule, idx) => (
          <div
            key={idx}
            className={`flex items-center space-x-2 transition-colors ${
              rule.valid ? 'text-teal-700 font-medium' : 'text-gray-400'
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                rule.valid
                  ? 'bg-teal-500 border-teal-500 text-white'
                  : 'border-gray-300 bg-white'
              }`}
            >
              {rule.valid && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            </div>
            <span className="text-xs leading-none">{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
