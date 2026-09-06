import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [devToken, setDevToken] = useState('');
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  const getEmailError = () => {
    if (!touched) return '';
    if (!email.trim()) return 'Please enter your email address.';
    if (!isValidEmail(email)) return 'Please enter a valid email address.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    setError('');

    const trimmed = email.trim();
    if (!trimmed || !isValidEmail(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.forgotPassword(trimmed);
      setSubmitted(true);
      if (res.reset_token) {
        setDevToken(res.reset_token);
      }
    } catch (err) {
      setError(err.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  const emailError = getEmailError();

  return (
    <div className="min-h-screen bg-[#FFF8F0] dark:bg-[#070D18] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <Link to="/" className="inline-block group mb-3">
            <img
              src="/logo.png"
              alt="VOYARA"
              className="h-16 w-auto mx-auto object-contain rounded-2xl shadow-lg border border-[#FDBA9A]/40 dark:border-slate-800 transition-transform duration-300 group-hover:scale-105"
            />
          </Link>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold font-serif text-[#102A43] dark:text-white">
            Reset your password
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Enter your email address and we'll help you reset your password.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-[#131D2E] py-8 px-6 sm:px-10 rounded-3xl shadow-xl border border-[#FDBA9A]/30 dark:border-slate-800 space-y-6">
          {submitted ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                <div className="flex items-center space-x-2 font-bold mb-1.5 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Password Reset Request Received</span>
                </div>
                <p className="text-xs text-emerald-900/90 dark:text-emerald-300/90 leading-relaxed">
                  If an account exists for <strong>{email}</strong>, you will receive instructions to reset your password shortly.
                </p>

                {devToken && (
                  <div className="mt-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200/80 dark:border-emerald-800/80 space-y-1.5">
                    <div className="flex items-center space-x-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-[#F97360]" />
                      <span>Local Development Token</span>
                    </div>
                    <code className="text-xs text-emerald-600 dark:text-emerald-400 font-mono break-all select-all block bg-emerald-50/50 dark:bg-emerald-950/30 p-2 rounded-lg border border-emerald-100 dark:border-emerald-800">
                      {devToken}
                    </code>
                    <Link
                      to={`/reset-password?token=${devToken}`}
                      className="mt-2 inline-block text-xs font-bold text-[#F97360] hover:underline"
                    >
                      Click here to reset password directly →
                    </Link>
                  </div>
                )}
              </div>

              <Link
                to="/login"
                className="w-full py-3 px-4 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-[#e05e4b] hover:to-orange-600 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all shadow-md shadow-[#F97360]/20"
              >
                <span>Back to Sign In</span>
              </Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    onBlur={() => setTouched(true)}
                    className={`w-full pl-10 pr-4 py-2.5 bg-[#FFF8F0]/50 dark:bg-slate-900 border rounded-xl text-sm text-slate-900 dark:text-white focus:outline-hidden focus:bg-white dark:focus:bg-slate-900 transition-all ${
                      emailError ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                    }`}
                  />
                </div>
                {emailError && (
                  <p className="mt-1 text-xs text-rose-500">{emailError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-[#e05e4b] hover:to-orange-600 text-white font-bold rounded-xl shadow-md shadow-[#F97360]/20 transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending...</span>
                  </div>
                ) : (
                  <span>Send Reset Link</span>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center space-x-1 text-xs text-slate-500 dark:text-slate-400 hover:text-[#F97360] font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
