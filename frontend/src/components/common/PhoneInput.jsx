import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Search, Phone } from 'lucide-react';

const COUNTRIES = [
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳', minLen: 10, maxLen: 10, pattern: '^[6-9][0-9]{9}$' },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', minLen: 10, maxLen: 10, pattern: '^[2-9][0-9]{9}$' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', minLen: 10, maxLen: 11, pattern: '^[1-9][0-9]{9,10}$' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪', minLen: 9, maxLen: 9, pattern: '^[5][0-9]{8}$' },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺', minLen: 9, maxLen: 9, pattern: '^[4][0-9]{8}$' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦', minLen: 10, maxLen: 10, pattern: '^[2-9][0-9]{9}$' },
  { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬', minLen: 8, maxLen: 8, pattern: '^[89][0-9]{7}$' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪', minLen: 10, maxLen: 11, pattern: '^[1-9][0-9]{9,10}$' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', minLen: 9, maxLen: 9, pattern: '^[67][0-9]{8}$' },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵', minLen: 10, maxLen: 10, pattern: '^[789]0[0-9]{8}$' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾', minLen: 9, maxLen: 10, pattern: '^[1][0-9]{8,9}$' },
  { code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩', minLen: 9, maxLen: 12, pattern: '^[8][0-9]{8,11}$' },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿', minLen: 8, maxLen: 10, pattern: '^[2][0-9]{7,9}$' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦', minLen: 9, maxLen: 9, pattern: '^[5][0-9]{8}$' },
  { code: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦', minLen: 8, maxLen: 8, pattern: '^[3567][0-9]{7}$' },
  { code: 'OM', name: 'Oman', dialCode: '+968', flag: '🇴🇲', minLen: 8, maxLen: 8, pattern: '^[79][0-9]{7}$' },
  { code: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼', minLen: 8, maxLen: 8, pattern: '^[569][0-9]{7}$' },
  { code: 'LK', name: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰', minLen: 9, maxLen: 9, pattern: '^[7][0-9]{8}$' },
  { code: 'NP', name: 'Nepal', dialCode: '+977', flag: '🇳🇵', minLen: 10, maxLen: 10, pattern: '^[9][0-9]{9}$' },
  { code: 'MV', name: 'Maldives', dialCode: '+960', flag: '🇲🇻', minLen: 7, maxLen: 7, pattern: '^[79][0-9]{6}$' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦', minLen: 9, maxLen: 9, pattern: '^[678][0-9]{8}$' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41', flag: '🇨🇭', minLen: 9, maxLen: 9, pattern: '^[7][0-9]{8}$' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱', minLen: 9, maxLen: 9, pattern: '^[6][0-9]{8}$' },
  { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸', minLen: 9, maxLen: 9, pattern: '^[67][0-9]{8}$' },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹', minLen: 9, maxLen: 10, pattern: '^[3][0-9]{8,9}$' },
  { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷', minLen: 10, maxLen: 11, pattern: '^[1-9][0-9]{9,10}$' },
  { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽', minLen: 10, maxLen: 10, pattern: '^[1-9][0-9]{9}$' },
  { code: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🇭', minLen: 9, maxLen: 9, pattern: '^[689][0-9]{8}$' },
  { code: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭', minLen: 10, maxLen: 10, pattern: '^[9][0-9]{9}$' },
];

export const PhoneInput = ({
  value = '',
  onChange,
  onBlur,
  disabled = false,
  id = 'phone-input',
}) => {
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]); // Default India
  const [localNumber, setLocalNumber] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  // Initialize from value if provided
  useEffect(() => {
    if (!value) {
      setLocalNumber('');
      return;
    }
    // Find matching country prefix
    const matched = COUNTRIES.find((c) => value.startsWith(c.dialCode));
    if (matched) {
      setSelectedCountry(matched);
      setLocalNumber(value.slice(matched.dialCode.length));
    } else if (value.startsWith('+')) {
      // Fallback
      setLocalNumber(value.replace(/^\+\d{1,4}/, ''));
    } else {
      setLocalNumber(value);
    }
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Validation function
  const validateNumber = (number, country) => {
    const digits = number.replace(/\D/g, '');
    if (!digits) return { isValid: false, message: '' };
    if (digits.length < country.minLen || digits.length > country.maxLen) {
      return { isValid: false, message: `Please enter a valid ${country.minLen}-digit phone number.` };
    }
    // Check dummy repeated digits
    if (/^(\d)\1+$/.test(digits)) {
      return { isValid: false, message: 'Please enter a valid phone number.' };
    }
    if (country.pattern && !new RegExp(country.pattern).test(digits)) {
      return { isValid: false, message: 'Please enter a valid phone number.' };
    }
    return { isValid: true, message: 'Valid phone number' };
  };

  const handleNumberChange = (e) => {
    const inputVal = e.target.value;
    const digits = inputVal.replace(/\D/g, '').slice(0, selectedCountry.maxLen);
    setLocalNumber(digits);

    const fullInternational = digits ? `${selectedCountry.dialCode}${digits}` : '';
    const validation = validateNumber(digits, selectedCountry);

    if (onChange) {
      onChange(fullInternational, validation.isValid);
    }
  };

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setDropdownOpen(false);
    setSearchQuery('');

    const trimmedDigits = localNumber.slice(0, country.maxLen);
    setLocalNumber(trimmedDigits);

    const fullInternational = trimmedDigits ? `${country.dialCode}${trimmedDigits}` : '';
    const validation = validateNumber(trimmedDigits, country);

    if (onChange) {
      onChange(fullInternational, validation.isValid);
    }
  };

  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.dialCode.includes(searchQuery) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const validation = validateNumber(localNumber, selectedCountry);
  const isFilled = localNumber.length > 0;

  return (
    <div className="space-y-1.5" ref={dropdownRef}>
      <div className="relative flex items-center">
        {/* Country Selector Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="h-11 px-3 flex items-center space-x-1.5 bg-[#FFF8F0]/80 dark:bg-slate-800 hover:bg-[#FDBA9A]/20 dark:hover:bg-slate-700 border border-r-0 border-slate-200 dark:border-slate-700 rounded-l-xl text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors shrink-0 focus:outline-hidden"
          title={`${selectedCountry.name} (${selectedCountry.dialCode})`}
        >
          <span className="text-base leading-none">{selectedCountry.flag}</span>
          <span className="font-mono text-xs">{selectedCountry.dialCode}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Local Number Input */}
        <div className="relative flex-1">
          <input
            id={id}
            type="tel"
            disabled={disabled}
            value={localNumber}
            onChange={handleNumberChange}
            onBlur={onBlur}
            autoComplete="tel-national"
            className={`w-full h-11 px-3.5 bg-[#FFF8F0]/40 dark:bg-slate-900 border rounded-r-xl text-sm font-mono tracking-wide text-slate-900 dark:text-white focus:outline-hidden focus:bg-white dark:focus:bg-slate-900 transition-all ${
              isFilled && validation.isValid
                ? 'border-emerald-500 focus:border-emerald-600'
                : isFilled && !validation.isValid
                ? 'border-rose-400 focus:border-rose-500'
                : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
            }`}
          />
        </div>

        {/* Country Dropdown Panel */}
        {dropdownOpen && (
          <div className="absolute left-0 top-12 z-50 w-72 max-h-64 bg-white dark:bg-[#131D2E] border border-[#FDBA9A]/40 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95 duration-100">
            {/* Search filter */}
            <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-[#FFF8F0]/50 dark:bg-slate-900/60 sticky top-0">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5" />
                <input
                  type="text"
                  placeholder="Search country or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 max-h-52">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((c) => {
                  const isSelected = c.code === selectedCountry.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleCountrySelect(c)}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs hover:bg-[#FFF8F0] dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                        isSelected ? 'bg-emerald-500/15 font-bold text-emerald-700 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <span className="text-base">{c.flag}</span>
                        <span className="truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0 ml-2">
                        <span className="font-mono text-[11px] text-slate-400">{c.dialCode}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">No countries found</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Live validation message indicator */}
      {isFilled && (
        <div className="flex items-center space-x-1.5 text-xs pt-0.5">
          {validation.isValid ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center space-x-1">
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 inline" />
              <span>Valid phone number</span>
            </span>
          ) : (
            <span className="text-rose-500 text-xs">
              {validation.message || 'Please enter a valid phone number.'}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
