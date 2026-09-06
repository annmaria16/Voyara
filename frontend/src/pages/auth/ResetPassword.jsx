import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { Lock, KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';

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
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

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
            Create a new password
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Choose a strong password to secure your Voyara account.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-[#131D2E] py-8 px-6 sm:px-10 rounded-3xl shadow-xl border border-[#FDBA9A]/30 dark:border-slate-800 space-y-6">
          
          {/* SUCCESS STATE */}
          {success ? (
            <div className="text-center space-y-4 py-4 animate-in fade-in-50 zoom-in-95 duration-200">
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 shadow-sm">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#102A43] dark:text-white">
                  Your password has been reset successfully.
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  You can now sign in to Voyara with your new password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-[#e05e4b] hover:to-orange-600 text-white font-bold rounded-xl text-sm shadow-md shadow-[#F97360]/20 transition-all cursor-pointer"
              >
                Sign In
              </button>
            </div>
          ) : isTokenInvalid ? (
            /* EXPIRED / INVALID TOKEN STATE */
            <div className="text-center space-y-4 py-4 animate-in fade-in-50 duration-200">
              <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-full flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400 shadow-sm">
                <AlertCircle className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#102A43] dark:text-white">
                  This password reset link is invalid or has expired.
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Password reset links expire for your security. Please request a fresh reset link.
                </p>
              </div>
              <div className="pt-2 space-y-2">
                <Link
                  to="/forgot-password"
                  className="w-full py-3 px-4 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-[#e05e4b] hover:to-orange-600 text-white font-bold rounded-xl text-sm shadow-md shadow-[#F97360]/20 transition-all flex items-center justify-center"
                >
                  Request a New Link
                </Link>
                <Link
                  to="/login"
                  className="block text-center text-xs text-slate-500 dark:text-slate-400 hover:text-[#F97360]"
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

              {/* Reset Token input */}
              <div>
                <label
                  htmlFor="reset-token"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
                >
                  Reset Token
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    id="reset-token"
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, token: true }))}
                    className={`w-full pl-10 pr-4 py-2.5 bg-[#FFF8F0]/50 dark:bg-slate-900 border rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:bg-white dark:focus:bg-slate-900 transition-all ${
                      getTokenError() ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                    }`}
                  />
                </div>
                {getTokenError() && (
                  <p className="mt-1 text-xs text-rose-500">{getTokenError()}</p>
                )}
              </div>

              {/* New Password */}
              <div>
                <label
                  htmlFor="reset-new-password"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
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
                    className={`w-full pl-10 pr-10 py-2.5 bg-[#FFF8F0]/50 dark:bg-slate-900 border rounded-xl text-sm text-slate-900 dark:text-white focus:outline-hidden focus:bg-white dark:focus:bg-slate-900 transition-all ${
                      newPassword.length > 0
                        ? isPasswordValid
                          ? 'border-emerald-400 ring-2 ring-emerald-100 focus:border-emerald-500'
                          : 'border-amber-400 ring-2 ring-amber-100 focus:border-amber-500'
                        : touched.newPassword
                        ? 'border-rose-400 ring-2 ring-rose-100'
                        : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
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
                    <div className="mt-1.5 flex items-center space-x-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in-50">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
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
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
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
                    className={`w-full pl-10 pr-10 py-2.5 bg-[#FFF8F0]/50 dark:bg-slate-900 border rounded-xl text-sm text-slate-900 dark:text-white focus:outline-hidden focus:bg-white dark:focus:bg-slate-900 transition-all ${
                      confirmPassword.length > 0
                        ? passwordsMatch
                          ? 'border-emerald-400 ring-2 ring-emerald-100 focus:border-emerald-500'
                          : 'border-rose-400 ring-2 ring-rose-100 focus:border-rose-500'
                        : touched.confirmPassword
                        ? 'border-rose-400 ring-2 ring-rose-100'
                        : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
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
                    <div className="mt-1.5 flex items-center space-x-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in-50">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
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
                className="w-full py-3 px-4 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-[#e05e4b] hover:to-orange-600 text-white font-bold rounded-xl shadow-md shadow-[#F97360]/20 transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer disabled:opacity-50 mt-4"
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
                  className="inline-flex items-center space-x-1 text-xs text-slate-500 dark:text-slate-400 hover:text-[#F97360]"
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
