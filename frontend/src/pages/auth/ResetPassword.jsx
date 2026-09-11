import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { Lock, KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff, ArrowLeft, ShieldCheck } from 'lucide-react';

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [touched, setTouched] = useState({});
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isTokenInvalid, setIsTokenInvalid] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Password requirements check
  const passwordChecks = {
    length: newPassword.length >= 6,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[!@#$%^&*(),.?":{}|<>\-_=+[\]/\\~`';]/.test(newPassword),
  };

  const isPasswordSecure = (val) =>
    val.length >= 6 &&
    /[A-Z]/.test(val) &&
    /[a-z]/.test(val) &&
    /[0-9]/.test(val) &&
    /[!@#$%^&*(),.?":{}|<>\-_=+[\]/\\~`';]/.test(val);

  const getMissingPasswordRequirements = () => {
    const missing = [];
    if (!passwordChecks.length) missing.push('6+ characters');
    if (!passwordChecks.upper) missing.push('uppercase letter (A-Z)');
    if (!passwordChecks.lower) missing.push('lowercase letter (a-z)');
    if (!passwordChecks.number) missing.push('number (0-9)');
    if (!passwordChecks.special) missing.push('special character (!@#...)');
    return missing;
  };

  const isPasswordValid = isPasswordSecure(newPassword);
  const passwordsMatch = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword;

  const getTokenError = () => {
    if (!touched.token) return '';
    if (!token.trim()) return 'Please enter your reset token.';
    return '';
  };

  const getPasswordError = () => {
    if (!touched.newPassword && !newPassword) return '';
    if (!newPassword) return 'Please enter a new password.';
    if (!isPasswordSecure(newPassword)) return 'Please meet all password requirements.';
    return '';
  };

  const getConfirmPasswordError = () => {
    if (!touched.confirmPassword && !confirmPassword) return '';
    if (!confirmPassword) return 'Please confirm your new password.';
    if (confirmPassword !== newPassword) return 'Passwords do not match.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ token: true, newPassword: true, confirmPassword: true });
    setError('');
    setIsTokenInvalid(false);

    if (!token.trim()) {
      setError('Please enter your reset token.');
      return;
    }
    if (!isPasswordSecure(newPassword)) {
      setError('Please meet all password requirements.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token.trim(), newPassword);
      setSuccess(true);
    } catch (err) {
      const errMsg = err.message || 'Failed to reset password.';
      setError(errMsg);
      if (errMsg.toLowerCase().includes('invalid') || errMsg.toLowerCase().includes('expired')) {
        setIsTokenInvalid(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF7] dark:bg-[#091B29] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors relative overflow-hidden">
      {/* Ambient background orbs */}
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
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Secure Password Update</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#17324D] dark:text-white">
            Create a new password
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-[#607080] dark:text-slate-400">
            Choose a strong password to secure your Voyara account.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white dark:bg-[#0F273D] py-8 px-6 sm:px-10 rounded-3xl shadow-xl border border-slate-100 dark:border-teal-900/40 space-y-6">
          
          {/* SUCCESS STATE */}
          {success ? (
            <div className="text-center space-y-4 py-4 animate-in fade-in-50 zoom-in-95 duration-200">
              <div className="w-14 h-14 bg-[#DDF3E7] dark:bg-[#35A66F]/20 border border-[#35A66F]/30 rounded-full flex items-center justify-center mx-auto text-[#35A66F] shadow-sm">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#17324D] dark:text-white">
                  Password reset successful!
                </h3>
                <p className="text-xs text-[#607080] dark:text-slate-400">
                  You can now sign in to your Voyara account with your new password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-bold rounded-2xl text-sm shadow-md shadow-[#F97316]/20 transition-all cursor-pointer"
              >
                Go to Login
              </button>
            </div>
          ) : isTokenInvalid ? (
            /* EXPIRED / INVALID TOKEN STATE */
            <div className="text-center space-y-4 py-4 animate-in fade-in-50 duration-200">
              <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-full flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400 shadow-sm">
                <AlertCircle className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#17324D] dark:text-white">
                  This reset link is invalid or expired
                </h3>
                <p className="text-xs text-[#607080] dark:text-slate-400">
                  Password reset links expire for your security. Please request a fresh reset link.
                </p>
              </div>
              <div className="pt-2 space-y-2">
                <Link
                  to="/forgot-password"
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-bold rounded-2xl text-sm shadow-md shadow-[#F97316]/20 transition-all flex items-center justify-center"
                >
                  Request a New Link
                </Link>
                <Link
                  to="/login"
                  className="block text-center text-xs text-[#607080] dark:text-slate-400 hover:text-[#087F8C]"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            /* RESET FORM */
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Reset Token */}
              {tokenFromUrl ? (
                <div className="p-2.5 bg-[#DDF3E7] dark:bg-[#35A66F]/20 border border-[#35A66F]/40 rounded-xl text-xs flex items-center justify-between text-[#35A66F]">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-[#35A66F] shrink-0" />
                    <span className="font-semibold">Secure reset link verified</span>
                  </div>
                  <span className="text-[10px] text-[#35A66F] font-mono">1-Time Valid</span>
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="reset-token"
                    className="block text-xs font-bold uppercase tracking-wider text-[#17324D] dark:text-slate-300 mb-1"
                  >
                    Reset Token
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      id="reset-token"
                      type="text"
                      required
                      placeholder="Paste your reset token here"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      onBlur={() => setTouched((p) => ({ ...p, token: true }))}
                      className={`w-full pl-10 pr-4 py-2.5 bg-[#FFFDF7]/50 dark:bg-[#091B29] border rounded-xl text-xs font-mono text-[#17324D] dark:text-white focus:outline-hidden focus:bg-white dark:focus:bg-[#091B29] transition-all ${
                        getTokenError() ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700 focus:border-[#087F8C] focus:ring-2 focus:ring-[#087F8C]/20'
                      }`}
                    />
                  </div>
                  {getTokenError() && (
                    <p className="mt-1 text-xs text-rose-500">{getTokenError()}</p>
                  )}
                </div>
              )}

              {/* New Password */}
              <div>
                <label
                  htmlFor="reset-new-password"
                  className="block text-xs font-bold uppercase tracking-wider text-[#17324D] dark:text-slate-300 mb-1"
                >
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    id="reset-new-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (error) setError('');
                    }}
                    onBlur={() => setTouched((p) => ({ ...p, newPassword: true }))}
                    className={`w-full pl-10 pr-10 py-2.5 bg-[#FFFDF7]/50 dark:bg-[#091B29] border rounded-xl text-sm text-[#17324D] dark:text-white focus:outline-hidden focus:bg-white dark:focus:bg-[#091B29] transition-all ${
                      newPassword.length > 0
                        ? isPasswordValid
                          ? 'border-[#35A66F] ring-2 ring-[#35A66F]/20 focus:border-[#35A66F]'
                          : 'border-amber-400 ring-2 ring-amber-100 dark:ring-amber-900/40 focus:border-amber-500'
                        : touched.newPassword
                        ? 'border-rose-400 ring-2 ring-rose-100'
                        : 'border-slate-200 dark:border-slate-700 focus:border-[#087F8C] focus:ring-2 focus:ring-[#087F8C]/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-hidden cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Live Password Strength Indicator */}
                {newPassword.length > 0 ? (
                  isPasswordValid ? (
                    <div className="mt-1.5 flex items-center space-x-1.5 text-xs text-[#35A66F] font-medium animate-in fade-in-50">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#35A66F] shrink-0" />
                      <span>Password meets all strength requirements</span>
                    </div>
                  ) : (
                    <div className="mt-1.5 flex items-start space-x-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium animate-in fade-in-50">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <span>Needs: {getMissingPasswordRequirements().join(', ')}</span>
                    </div>
                  )
                ) : touched.newPassword ? (
                  <p className="mt-1 text-xs text-rose-500">Please enter a new password.</p>
                ) : null}
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="reset-confirm-password"
                  className="block text-xs font-bold uppercase tracking-wider text-[#17324D] dark:text-slate-300 mb-1"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    id="reset-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError('');
                    }}
                    onBlur={() => setTouched((p) => ({ ...p, confirmPassword: true }))}
                    className={`w-full pl-10 pr-10 py-2.5 bg-[#FFFDF7]/50 dark:bg-[#091B29] border rounded-xl text-sm text-[#17324D] dark:text-white focus:outline-hidden focus:bg-white dark:focus:bg-[#091B29] transition-all ${
                      confirmPassword.length > 0
                        ? passwordsMatch
                          ? 'border-[#35A66F] ring-2 ring-[#35A66F]/20 focus:border-[#35A66F]'
                          : 'border-rose-400 ring-2 ring-rose-100 dark:ring-rose-950 focus:border-rose-500'
                        : touched.confirmPassword
                        ? 'border-rose-400 ring-2 ring-rose-100'
                        : 'border-slate-200 dark:border-slate-700 focus:border-[#087F8C] focus:ring-2 focus:ring-[#087F8C]/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-hidden cursor-pointer"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Live Confirm Password Match Indicator */}
                {confirmPassword.length > 0 ? (
                  passwordsMatch ? (
                    <div className="mt-1.5 flex items-center space-x-1.5 text-xs text-[#35A66F] font-medium animate-in fade-in-50">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#35A66F] shrink-0" />
                      <span>Passwords match</span>
                    </div>
                  ) : (
                    <div className="mt-1.5 flex items-center space-x-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium animate-in fade-in-50">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>Passwords do not match</span>
                    </div>
                  )
                ) : touched.confirmPassword ? (
                  <p className="mt-1 text-xs text-rose-500">Please confirm your new password.</p>
                ) : null}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-bold rounded-2xl shadow-md shadow-[#F97316]/20 transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer disabled:opacity-50 mt-4"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Updating password...</span>
                  </div>
                ) : (
                  <span>Reset Password</span>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center space-x-1 text-xs text-[#607080] dark:text-slate-400 hover:text-[#087F8C] dark:hover:text-[#27B7A8] transition-colors"
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

export default ResetPassword;
