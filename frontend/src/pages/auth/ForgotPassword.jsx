import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw, Send, Sparkles } from 'lucide-react';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
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
      await authApi.forgotPassword(trimmed);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to request password reset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const emailError = getEmailError();

  return (
    <div className="min-h-screen bg-[#FFFDF7] dark:bg-[#091B29] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors relative overflow-hidden">
      {/* Decorative background blurs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#087F8C]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#F97316]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="text-center">
          <Link to="/" className="inline-block group mb-3">
            <img
              src="/logo.png"
              alt="VOYARA"
              className="h-16 w-auto mx-auto object-contain rounded-2xl shadow-lg border border-[#087F8C]/20 dark:border-teal-900/40 transition-transform duration-300 group-hover:scale-105"
            />
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#087F8C]/10 dark:bg-[#087F8C]/20 text-[#087F8C] dark:text-[#27B7A8] text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Account Recovery</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#17324D] dark:text-white">
            Reset your password
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-[#607080] dark:text-slate-400">
            Enter your registered email address to receive password reset instructions.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white dark:bg-[#0F273D] py-8 px-6 sm:px-10 rounded-3xl shadow-xl border border-slate-100 dark:border-teal-900/40 space-y-6">
          {submitted ? (
            <div className="space-y-5 text-center py-2 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-[#DDF3E7] dark:bg-[#35A66F]/20 text-[#35A66F] dark:text-[#35A66F] rounded-3xl flex items-center justify-center mx-auto border border-[#35A66F]/30 shadow-xs">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold font-serif text-[#17324D] dark:text-white">
                  Check your email
                </h3>
                <p className="text-xs sm:text-sm text-[#607080] dark:text-slate-300 leading-relaxed max-w-sm mx-auto">
                  If an account exists for <strong className="text-[#17324D] dark:text-white font-semibold">{email}</strong>, we've sent you a password reset link.
                </p>
              </div>

              <div className="p-4 bg-[#FFFDF7] dark:bg-[#091B29] rounded-2xl border border-slate-200/80 dark:border-teal-900/40 text-left text-xs space-y-1.5 text-[#607080] dark:text-slate-400">
                <div className="flex items-center space-x-1.5 font-bold text-[#17324D] dark:text-slate-200">
                  <span>📬 Next Steps:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] leading-relaxed">
                  <li>Open your email inbox and click the reset link.</li>
                  <li>The link is valid for <strong>1 hour</strong>.</li>
                  <li>If you don't see it, check your <strong>Spam / Junk</strong> folder.</li>
                </ul>
              </div>

              <div className="pt-2 space-y-3">
                <Link
                  to="/login"
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all shadow-md shadow-[#F97316]/20 cursor-pointer"
                >
                  <span>Back to Sign In</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setError('');
                  }}
                  className="inline-flex items-center space-x-1.5 text-xs text-[#607080] dark:text-slate-400 hover:text-[#087F8C] dark:hover:text-[#27B7A8] font-semibold cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Didn't receive email? Try another address</span>
                </button>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              {error && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-xs font-bold uppercase tracking-wider text-[#17324D] dark:text-slate-300 mb-1.5"
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
                    placeholder="e.g. yourname@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    onBlur={() => setTouched(true)}
                    className={`w-full pl-10 pr-4 py-2.5 bg-[#FFFDF7]/50 dark:bg-[#091B29] border rounded-xl text-sm text-[#17324D] dark:text-white focus:outline-hidden focus:bg-white dark:focus:bg-[#091B29] transition-all ${
                      emailError ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700 focus:border-[#087F8C] focus:ring-2 focus:ring-[#087F8C]/20'
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
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-bold rounded-2xl shadow-md shadow-[#F97316]/20 transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending Reset Link...</span>
                  </div>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Reset Link</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center space-x-1 text-xs text-[#607080] dark:text-slate-400 hover:text-[#087F8C] dark:hover:text-[#27B7A8] font-medium transition-colors"
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

export default ForgotPassword;
