import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ShieldCheck, MapPin, Headphones, User, LogIn, Sparkles } from 'lucide-react';
import { GoogleAuthButton } from '../../components/common/GoogleAuthButton';
import { GoogleOnboardingModal } from '../../components/auth/GoogleOnboardingModal';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [loading, setLoading] = useState(false);

  // Google OAuth state
  const [googleOnboardingData, setGoogleOnboardingData] = useState(null);
  const [googleCredential, setGoogleCredential] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  const { login, googleAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectNotice = location.state?.message;
  const registeredSuccess = location.state?.registeredSuccess;
  const registeredEmail = location.state?.registeredEmail;

  useEffect(() => {
    if (registeredEmail && !email) {
      setEmail(registeredEmail);
    }
  }, [registeredEmail]);

  const from =
    typeof location.state?.from === 'string'
      ? location.state.from
      : location.state?.from?.pathname || null;

  const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  const getEmailError = () => {
    if (!touched.email) return '';
    if (!email.trim()) return 'Please enter your email address.';
    if (!isValidEmail(email)) return 'Please enter a valid email address.';
    return '';
  };

  const getPasswordError = () => {
    if (!touched.password) return '';
    if (!password) return 'Please enter your password.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const user = await login(trimmedEmail, password);
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else if (user.role === 'PROVIDER') {
        navigate('/provider');
      } else {
        if (from && !from.startsWith('/login') && !from.startsWith('/register')) {
          navigate(from);
        } else {
          navigate('/customer');
        }
      }
    } catch (err) {
      setError(err.message || 'Incorrect email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential) => {
    setGoogleCredential(credential);
    setError('');
    setGoogleError('');
    setGoogleLoading(true);

    try {
      const res = await googleAuth({ credential });
      if (res.needs_onboarding) {
        setGoogleOnboardingData(res.google_data);
      } else if (res.user) {
        if (res.user.role === 'ADMIN') {
          navigate('/admin');
        } else if (res.user.role === 'PROVIDER') {
          navigate('/provider');
        } else {
          if (from && !from.startsWith('/login') && !from.startsWith('/register')) {
            navigate(from);
          } else {
            navigate('/customer');
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Google authentication failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = (errMsg) => {
    setError(errMsg || 'Google sign in failed.');
  };

  const handleGoogleOnboardingSubmit = async ({ role, phone, business_name }) => {
    setGoogleLoading(true);
    setGoogleError('');
    try {
      const res = await googleAuth({
        credential: googleCredential,
        role,
        phone,
        business_name,
      });

      if (res.user) {
        setGoogleOnboardingData(null);
        if (res.user.role === 'ADMIN') {
          navigate('/admin');
        } else if (res.user.role === 'PROVIDER') {
          navigate('/provider');
        } else {
          navigate('/customer');
        }
      }
    } catch (err) {
      setGoogleError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const emailError = getEmailError();
  const passwordError = getPasswordError();

  return (
    <div className="min-h-screen bg-[#FFFDF7] dark:bg-[#091B29] py-6 sm:py-10 px-3 sm:px-6 lg:px-8 flex flex-col justify-center items-center font-sans overflow-x-hidden transition-colors">
      <div className="w-full max-w-5xl bg-white dark:bg-[#0F273D] rounded-3xl shadow-2xl border border-[#E0ECEF] dark:border-white/10 overflow-hidden grid grid-cols-1 lg:grid-cols-12 my-auto">
        
        {/* LEFT COLUMN: Hero Visual & Value Props */}
        <div className="lg:col-span-6 relative hidden lg:flex flex-col justify-between p-8 sm:p-12 text-white overflow-hidden">
          {/* Background Image with warm overlay */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=85')`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#091B29] via-[#091B29]/65 to-[#091B29]/40" />

          {/* Top Brand & Slogan */}
          <div className="relative z-10 space-y-2">
            <span className="text-[11px] font-extrabold tracking-widest text-[#F6C945] uppercase">
              Stay. Explore. Experience.
            </span>
            <h2 className="text-4xl xl:text-5xl font-black font-serif leading-tight tracking-tight text-white drop-shadow-md">
              Find Your Place.
            </h2>
            <p className="text-white/85 text-sm font-light leading-relaxed">
              Discover authentic Indian homestays, cottages, villas, and unforgettable host adventures.
            </p>
          </div>

          {/* Bottom Value Badges */}
          <div className="relative z-10 space-y-3 my-auto pt-12">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-start space-x-3.5 shadow-lg">
              <div className="p-2 bg-[#087F8C]/40 rounded-xl text-[#27B7A8] shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4 text-[#F6C945]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-wide">VeriNova Integrity</h4>
                <p className="text-[11px] text-white/70 leading-snug">Every reservation is independently verified for rate and inventory accuracy.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-start space-x-3.5 shadow-lg">
              <div className="p-2 bg-[#F97316]/30 rounded-xl text-[#F6C945] shrink-0 mt-0.5">
                <MapPin className="w-4 h-4 text-[#F97316]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-wide">Handpicked Stays</h4>
                <p className="text-[11px] text-white/70 leading-snug">Curated homestays, tea estate lodges, and coastal hideaways.</p>
              </div>
            </div>
          </div>

          {/* Footer Copyright */}
          <div className="relative z-10 pt-4 border-t border-white/10 text-[11px] text-white/60">
            © {new Date().getFullYear()} Voyara Inc. Find Your Place.
          </div>
        </div>

        {/* RIGHT COLUMN: Authentication Card */}
        <div className="lg:col-span-6 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-white dark:bg-[#0F273D]">
          <div className="max-w-md w-full mx-auto space-y-6">
            
            {/* Logo & Header */}
            <div className="text-center space-y-2">
              <Link to="/" className="inline-block group">
                <img
                  src="/logo.png"
                  alt="VOYARA"
                  className="h-14 w-auto mx-auto object-contain rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-105"
                />
              </Link>
              <h1 className="text-2xl sm:text-3xl font-black font-serif text-[#17324D] dark:text-white pt-1">
                Welcome back to Voyara
              </h1>
              <p className="text-xs sm:text-sm text-[#607080] dark:text-slate-400 font-light">
                Your next place is waiting.
              </p>
            </div>

            {/* Registration Success Banner */}
            {registeredSuccess && (
              <div className="p-4 bg-[#DDF3E7] dark:bg-emerald-950/40 border border-[#35A66F]/40 rounded-2xl flex items-start space-x-3 text-[#236C48] dark:text-emerald-300 text-xs sm:text-sm animate-in fade-in-50 duration-200">
                <CheckCircle2 className="w-5 h-5 text-[#35A66F] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-[#236C48] dark:text-emerald-300">Account Created Successfully!</span>
                  <span className="text-[#236C48]/90 dark:text-emerald-400">Please sign in with your email and password.</span>
                </div>
              </div>
            )}

            {/* Context Notice */}
            {!registeredSuccess && redirectNotice && (
              <div className="p-3.5 bg-[#DDF3E7]/80 dark:bg-emerald-950/40 border border-[#35A66F]/30 rounded-2xl flex items-center space-x-2.5 text-[#087F8C] dark:text-emerald-300 text-xs font-medium">
                <Sparkles className="w-4 h-4 text-[#F97316] shrink-0" />
                <span>{redirectNotice}</span>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center space-x-2.5 text-rose-700 dark:text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              
              {/* EMAIL ADDRESS */}
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                    className={`w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-sm text-[#17324D] dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#087F8C]/20 focus:border-[#087F8C] transition-all ${
                      emailError ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  />
                </div>
                {emailError && (
                  <p className="mt-1 text-xs text-rose-500">{emailError}</p>
                )}
              </div>

              {/* PASSWORD */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password"
                    className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                  >
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-[#087F8C] dark:text-[#27B7A8] hover:underline font-bold"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                    onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                    className={`w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-sm text-[#17324D] dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#087F8C]/20 focus:border-[#087F8C] transition-all ${
                      passwordError ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200 dark:border-slate-700'
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
                {passwordError && (
                  <p className="mt-1 text-xs text-rose-500">{passwordError}</p>
                )}
              </div>

              {/* REMEMBER ME CHECKBOX */}
              <div className="flex items-center">
                <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-600 dark:text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded-md border-slate-300 dark:border-slate-700 text-[#087F8C] focus:ring-[#087F8C] focus:ring-offset-0"
                  />
                  <span>Remember me</span>
                </label>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-[#F97316] hover:bg-[#FF8A3D] active:scale-[0.99] text-white font-bold rounded-xl shadow-md shadow-orange-950/20 transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer disabled:opacity-50 font-sans"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </div>
                )}
              </button>
            </form>

            {/* DIVIDER: OR */}
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-slate-200 dark:border-slate-700 w-full"></div>
              <span className="bg-white dark:bg-[#0F273D] px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
                or
              </span>
              <div className="border-t border-slate-200 dark:border-slate-700 w-full"></div>
            </div>

            {/* GOOGLE SIGN IN BUTTON */}
            <GoogleAuthButton
              mode="signin"
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              disabled={loading || googleLoading}
            />

            {/* Bottom Registration CTA */}
            <div className="pt-2 text-center text-xs text-slate-600 dark:text-slate-400">
              New to Voyara?{' '}
              <Link to="/register" className="font-bold text-[#087F8C] dark:text-[#27B7A8] hover:underline">
                Create Account
              </Link>
            </div>

          </div>
        </div>

      </div>

      {/* Google Onboarding Modal for New Google Users */}
      <GoogleOnboardingModal
        isOpen={!!googleOnboardingData}
        googleData={googleOnboardingData}
        onSubmit={handleGoogleOnboardingSubmit}
        onCancel={() => {
          setGoogleOnboardingData(null);
          setGoogleCredential('');
          setGoogleError('');
        }}
        loading={googleLoading}
        error={googleError}
      />
    </div>
  );
};
