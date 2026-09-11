import React, { useState } from 'react';
import { User, Luggage, Home, Building, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { PhoneInput } from '../common/PhoneInput';

export const GoogleOnboardingModal = ({
  isOpen,
  googleData,
  onSubmit,
  onCancel,
  loading,
  error,
}) => {
  const [selectedRole, setSelectedRole] = useState('CUSTOMER'); // 'CUSTOMER' or 'PROVIDER'
  const [phone, setPhone] = useState('');
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [touched, setTouched] = useState({});
  const [localError, setLocalError] = useState('');

  if (!isOpen || !googleData) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched({ phone: true, businessName: true });
    setLocalError('');

    if (!phone || !isPhoneValid) {
      setLocalError('Please enter a valid international phone number.');
      return;
    }

    if (selectedRole === 'PROVIDER' && (!businessName.trim() || businessName.trim().length < 2)) {
      setLocalError('Please enter your property or brand name.');
      return;
    }

    onSubmit({
      role: selectedRole,
      phone: phone.trim(),
      business_name: selectedRole === 'PROVIDER' ? businessName.trim() : undefined,
    });
  };

  const displayError = error || localError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in-50 duration-200">
      <div className="bg-white dark:bg-[#131D2E] rounded-3xl shadow-2xl border border-[#FDBA9A]/30 dark:border-slate-800 max-w-lg w-full p-6 sm:p-8 space-y-5 relative max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          title="Cancel"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Google Profile Badge */}
        <div className="text-center space-y-2">
          {googleData.picture ? (
            <img
              src={googleData.picture}
              alt={googleData.name || 'User'}
              className="w-16 h-16 rounded-full mx-auto border-2 border-emerald-500 shadow-md object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full mx-auto bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xl shadow-md">
              {googleData.name ? googleData.name.charAt(0).toUpperCase() : 'V'}
            </div>
          )}

          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-[#102A43] dark:text-white">
              Welcome to Voyara, {googleData.name?.split(' ')[0] || 'Traveler'}!
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Verified Google account: <span className="font-semibold text-slate-800 dark:text-slate-200">{googleData.email}</span>
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {displayError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center space-x-2 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          
          {/* Role Selection */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              How will you use Voyara?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole('CUSTOMER')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start space-x-3 ${
                  selectedRole === 'CUSTOMER'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-transparent shadow-md'
                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div
                  className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                    selectedRole === 'CUSTOMER' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Luggage className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-xs font-bold">Traveler</span>
                  <span
                    className={`block text-[10px] mt-0.5 leading-tight ${
                      selectedRole === 'CUSTOMER' ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Find stays and experiences for your trips
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('PROVIDER')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start space-x-3 ${
                  selectedRole === 'PROVIDER'
                    ? 'bg-gradient-to-r from-orange-500 to-[#EA580C] text-white border-transparent shadow-md'
                    : 'bg-white dark:bg-[#091B29] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-teal-500/50'
                }`}
              >
                <div
                  className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                    selectedRole === 'PROVIDER' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Home className="w-4 h-4" />
                </div>
                <div>
                  <strong className="block text-xs font-bold font-serif">Stay Partner</strong>
                  <span
                    className={`text-[11px] block mt-0.5 ${
                      selectedRole === 'PROVIDER' ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    List stays and host experiences
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Host Property Name (if Host) */}
          {selectedRole === 'PROVIDER' && (
            <div className="animate-in fade-in-50 duration-150">
              <label
                htmlFor="google-business-name"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
              >
                Property / Business Name
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  id="google-business-name"
                  type="text"
                  required
                  placeholder="e.g. Hillview Eco Resorts & Treks"
                  value={businessName}
                  onChange={(e) => {
                    setBusinessName(e.target.value);
                    if (localError) setLocalError('');
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
          )}

          {/* Phone Number Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Phone Number <span className="text-orange-500">*</span>
            </label>
            <PhoneInput
              id="google-phone"
              value={phone}
              onChange={(val, valid) => {
                setPhone(val);
                setIsPhoneValid(valid);
                if (localError) setLocalError('');
              }}
              onBlur={() => setTouched((p) => ({ ...p, phone: true }))}
            />
            {touched.phone && (!phone || !isPhoneValid) && (
              <p className="mt-1 text-xs text-rose-500">Please enter a valid international phone number.</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-orange-500 to-[#EA580C] hover:from-orange-600 hover:to-[#c2410c] active:scale-[0.99] text-white font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer disabled:opacity-50 mt-4"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Setting up account...</span>
              </div>
            ) : (
              <span>Complete Setup & Continue</span>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};
