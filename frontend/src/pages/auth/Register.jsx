import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Mail,
  Lock,
  User,
  Building,
  Home,
  Luggage,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  Tag,
  CalendarCheck,
} from 'lucide-react';
import { PhoneInput } from '../../components/common/PhoneInput';
import { GoogleAuthButton } from '../../components/common/GoogleAuthButton';
import { GoogleOnboardingModal } from '../../components/auth/GoogleOnboardingModal';

export const Register = () => {
  const [selectedRole, setSelectedRole] = useState('CUSTOMER'); // 'CUSTOMER' (Traveler) or 'PROVIDER' (Host)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // Google OAuth state
  const [googleOnboardingData, setGoogleOnboardingData] = useState(null);
  const [googleCredential, setGoogleCredential] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  const { register, googleAuth } = useAuth();
  const navigate = useNavigate();

  const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  // Password requirements check
  const passwordChecks = {
    length: password.length >= 6,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>\-_=+[\]/\\~`';]/.test(password),
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

  const isPasswordValid = isPasswordSecure(password);
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const getNameError = () => {
    if (!touched.name) return '';
    if (!name.trim() || name.trim().length < 2) return 'Please enter your full name.';
    return '';
  };

  const getEmailError = () => {
    if (!touched.email) return '';
    if (!email.trim()) return 'Please enter your email address.';
    if (!isValidEmail(email)) return 'Please enter a valid email address.';
    return '';
  };

  const getPhoneError = () => {
    if (!touched.phone) return '';
    if (!phone) return 'Please enter your phone number.';
    if (!isPhoneValid) return 'Please enter a valid phone number.';
    return '';
  };

  const getBusinessNameError = () => {
    if (selectedRole !== 'PROVIDER' || !touched.businessName) return '';
    if (!businessName.trim() || businessName.trim().length < 2) {
      return 'Please enter your property or brand name.';
    }
    return '';
  };

  const getPasswordError = () => {
    if (!touched.password && !password) return '';
    if (!password) return 'Please enter your password.';
    if (!isPasswordSecure(password)) {
      return 'Password must be at least 6 characters and contain uppercase, lowercase, number, and special character.';
    }
    return '';
  };

  const getConfirmPasswordError = () => {
    if (!touched.confirmPassword && !confirmPassword) return '';
    if (!confirmPassword) return 'Please confirm your password.';
    if (confirmPassword !== password) return 'Passwords do not match.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({
      name: true,
      email: true,
      phone: true,
      businessName: true,
      password: true,
      confirmPassword: true,
    });
    setError('');

    if (!name.trim() || name.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!phone || !isPhoneValid) {
      setError('Please enter a valid international phone number.');
      return;
    }
    if (selectedRole === 'PROVIDER' && (!businessName.trim() || businessName.trim().length < 2)) {
      setError('Please enter your property or brand name.');
      return;
    }
    if (!isPasswordSecure(password)) {
      setError('Password must be at least 6 characters and contain an uppercase letter, lowercase letter, number, and special character.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        password,
        role: selectedRole,
        business_name: selectedRole === 'PROVIDER' ? businessName.trim() : undefined,
      });

      setSuccessData({
        email: email.toLowerCase().trim(),
        role: selectedRole,
        message: res.message || 'Your Voyara account has been created successfully.',
      });
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your information.');
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
      // If user already filled in phone on form, attempt direct signup, else trigger onboarding
      const payload = { credential };
      if (phone && isPhoneValid) {
        payload.role = selectedRole;
        payload.phone = phone.trim();
        if (selectedRole === 'PROVIDER' && businessName.trim()) {
          payload.business_name = businessName.trim();
        }
      }

      const res = await googleAuth(payload);
      if (res.needs_onboarding) {
        setGoogleOnboardingData(res.google_data);
      } else if (res.user) {
        if (res.user.role === 'ADMIN') {
          navigate('/admin');
        } else if (res.user.role === 'PROVIDER') {
          navigate('/provider');
        } else {
          navigate('/customer');
        }
      }
    } catch (err) {
      setError(err.message || 'Google signup failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = (errMsg) => {
    setError(errMsg || 'Google signup failed.');
  };

  const handleGoogleOnboardingSubmit = async ({ role, phone: obPhone, business_name }) => {
    setGoogleLoading(true);
    setGoogleError('');
    try {
      const res = await googleAuth({
        credential: googleCredential,
        role,
        phone: obPhone,
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

  const nameError = getNameError();
  const emailError = getEmailError();
  const phoneError = getPhoneError();
  const businessNameError = getBusinessNameError();
  const passwordError = getPasswordError();
  const confirmPasswordError = getConfirmPasswordError();

  return (
    <div className="min-h-screen bg-[#FFF8F0] dark:bg-[#070D18] py-6 sm:py-10 px-3 sm:px-6 lg:px-8 flex flex-col justify-center items-center font-sans overflow-x-hidden transition-colors">
      <div className="w-full max-w-5xl bg-white dark:bg-[#131D2E] rounded-3xl shadow-2xl border border-[#FDBA9A]/30 dark:border-slate-800 overflow-hidden grid grid-cols-1 lg:grid-cols-12 my-auto">
        
        {/* LEFT COLUMN: Hero Visual & Benefits */}
        <div className="lg:col-span-5 relative hidden lg:flex flex-col justify-between p-8 sm:p-10 text-white overflow-hidden min-h-[600px]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('/auth-stay-register.jpg')`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/80 via-[#0F172A]/50 to-[#0F172A]/95" />

          {/* Top Brand Logo & Slogan */}
          <div className="relative z-10 space-y-2">
            <Link to="/" className="inline-block group">
              <img
                src="/logo.png"
                alt="VOYARA"
                className="h-14 w-auto object-contain rounded-2xl shadow-lg border border-white/20 transition-transform duration-300 group-hover:scale-105"
              />
            </Link>
            <div>
              <span className="text-[#F97360] text-xs font-bold uppercase tracking-widest block font-mono">
                Find Your Place.
              </span>
              <p className="text-emerald-400 text-sm font-medium pt-0.5">
                Stay. Explore. Experience.
              </p>
            </div>
          </div>

          {/* Value Badges */}
          <div className="relative z-10 space-y-3 my-auto pt-10">
            <div className="p-3.5 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/10 flex items-start space-x-3.5 shadow-lg text-white">
              <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400 shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold tracking-wide">Verified Hosts</h4>
                <p className="text-[11px] text-slate-300 leading-snug">All hosts are verified for your safety.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/10 flex items-start space-x-3.5 shadow-lg text-white">
              <div className="p-2 bg-orange-500/20 rounded-xl text-[#F97360] shrink-0 mt-0.5">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold tracking-wide">Best Prices</h4>
                <p className="text-[11px] text-slate-300 leading-snug">Get transparent prices guaranteed.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/10 flex items-start space-x-3.5 shadow-lg text-white">
              <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400 shrink-0 mt-0.5">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold tracking-wide">Easy Booking</h4>
                <p className="text-[11px] text-slate-300 leading-snug">Book in minutes, stay with comfort.</p>
              </div>
            </div>
          </div>

          {/* Footer Copyright */}
          <div className="relative z-10 pt-4 border-t border-white/10 text-[11px] text-slate-400">
            © 2026 Voyara. All rights reserved.
          </div>
        </div>

        {/* RIGHT COLUMN: Registration Form */}
        <div className="lg:col-span-7 p-6 sm:p-8 md:p-10 lg:p-12 flex flex-col justify-center bg-white dark:bg-[#131D2E]">
          <div className="max-w-md w-full mx-auto space-y-5">
            
            {/* SUCCESS CONFIRMATION STATE */}
            {successData ? (
              <div className="space-y-6 text-center py-6 animate-in fade-in-50 zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 shadow-sm">
                  <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-bold font-serif text-[#102A43] dark:text-white">
                    Your Voyara account has been created successfully.
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
                    Account registered for <strong className="text-[#102A43] dark:text-white">{successData.email}</strong> as{' '}
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {successData.role === 'PROVIDER' ? 'Host' : 'Traveler'}
                    </span>.
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Please sign in with your email and password to access your dashboard.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      navigate('/login', {
                        state: {
                          registeredEmail: successData.email,
                          registeredSuccess: true,
                        },
                      })
                    }
                    className="w-full py-3.5 px-6 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-[#e05e4b] hover:to-orange-600 text-white font-bold rounded-xl shadow-md shadow-[#F97360]/20 transition-all text-sm cursor-pointer"
                  >
                    Continue to Sign In
                  </button>
                </div>
              </div>
            ) : (
              /* REGISTRATION FORM STATE */
              <>
                {/* Header */}
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#102A43] dark:text-white">
                    Create your account
                  </h1>
                  <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Join Voyara and start your journey today.
                  </p>
                </div>

                {/* Role Selector: "I am a" */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    I am a
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
                      <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${selectedRole === 'CUSTOMER' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                        <Luggage className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block text-xs font-bold">Traveler</span>
                        <span className={`block text-[10px] mt-0.5 leading-tight ${selectedRole === 'CUSTOMER' ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}>
                          Find stays and experiences
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedRole('PROVIDER')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start space-x-3 ${
                        selectedRole === 'PROVIDER'
                          ? 'bg-gradient-to-r from-[#F97360] to-orange-500 text-white border-transparent shadow-md'
                          : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${selectedRole === 'PROVIDER' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                        <Home className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block text-xs font-bold">Host</span>
                        <span className={`block text-[10px] mt-0.5 leading-tight ${selectedRole === 'PROVIDER' ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}>
                          List your stays and experiences
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center space-x-2.5 text-rose-700 dark:text-rose-300 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form className="space-y-3.5" onSubmit={handleSubmit} noValidate>
                  
                  {/* FULL NAME */}
                  <div>
                    <label
                      htmlFor="register-name"
                      className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                      <input
                        id="register-name"
                        type="text"
                        required
                        autoComplete="name"
                        placeholder="Enter your full name"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (error) setError('');
                        }}
                        onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                        className={`w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all ${
                          nameError ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      />
                    </div>
                    {nameError && (
                      <p className="mt-1 text-xs text-rose-500">{nameError}</p>
                    )}
                  </div>

                  {/* EMAIL ADDRESS */}
                  <div>
                    <label
                      htmlFor="register-email"
                      className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                      <input
                        id="register-email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (error) setError('');
                        }}
                        onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                        className={`w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all ${
                          emailError ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      />
                    </div>
                    {emailError && (
                      <p className="mt-1 text-xs text-rose-500">{emailError}</p>
                    )}
                  </div>

                  {/* PHONE NUMBER */}
                  <div>
                    <label
                      htmlFor="register-phone"
                      className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Phone Number
                    </label>
                    <PhoneInput
                      id="register-phone"
                      value={phone}
                      onChange={(val, valid) => {
                        setPhone(val);
                        setIsPhoneValid(valid);
                        if (error) setError('');
                      }}
                      onBlur={() => setTouched((p) => ({ ...p, phone: true }))}
                    />
                    {phoneError && (
                      <p className="mt-1 text-xs text-rose-500">{phoneError}</p>
                    )}
                  </div>

                  {/* HOST BUSINESS NAME (if Host) */}
                  {selectedRole === 'PROVIDER' && (
                    <div className="animate-in fade-in-50 duration-150">
                      <label
                        htmlFor="register-business-name"
                        className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
                      >
                        Property / Business Name
                      </label>
                      <div className="relative">
                        <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                        <input
                          id="register-business-name"
                          type="text"
                          required
                          placeholder="e.g. Hillview Eco Resorts & Treks"
                          value={businessName}
                          onChange={(e) => {
                            setBusinessName(e.target.value);
                            if (error) setError('');
                          }}
                          onBlur={() => setTouched((p) => ({ ...p, businessName: true }))}
                          className={`w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all ${
                            businessNameError ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200 dark:border-slate-700'
                          }`}
                        />
                      </div>
                      {businessNameError && (
                        <p className="mt-1 text-xs text-rose-500">{businessNameError}</p>
                      )}
                    </div>
                  )}

                  {/* PASSWORD */}
                  <div>
                    <label
                      htmlFor="register-password"
                      className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                      <input
                        id="register-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        placeholder="Create a strong password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (error) setError('');
                        }}
                        onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                        className={`w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                          password.length > 0
                            ? isPasswordValid
                              ? 'border-emerald-400 ring-2 ring-emerald-100 focus:border-emerald-500'
                              : 'border-amber-400 ring-2 ring-amber-100 focus:border-amber-500'
                            : touched.password
                            ? 'border-rose-400 ring-2 ring-rose-100'
                            : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500/20 focus:border-emerald-500'
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
                    {password.length > 0 ? (
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
                    ) : touched.password ? (
                      <p className="mt-1 text-xs text-rose-500">Please enter your password.</p>
                    ) : null}
                  </div>

                  {/* CONFIRM PASSWORD */}
                  <div>
                    <label
                      htmlFor="register-confirm-password"
                      className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                      <input
                        id="register-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (error) setError('');
                        }}
                        onBlur={() => setTouched((p) => ({ ...p, confirmPassword: true }))}
                        className={`w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                          confirmPassword.length > 0
                            ? passwordsMatch
                              ? 'border-emerald-400 ring-2 ring-emerald-100 focus:border-emerald-500'
                              : 'border-rose-400 ring-2 ring-rose-100 focus:border-rose-500'
                            : touched.confirmPassword
                            ? 'border-rose-400 ring-2 ring-rose-100'
                            : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500/20 focus:border-emerald-500'
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
                      <p className="mt-1 text-xs text-rose-500">Please confirm your password.</p>
                    ) : null}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-[#e05e4b] hover:to-orange-600 active:scale-[0.99] text-white font-bold rounded-xl shadow-md shadow-[#F97360]/20 transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer disabled:opacity-50 mt-4"
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Creating account...</span>
                      </div>
                    ) : (
                      <span>Create Account</span>
                    )}
                  </button>
                </form>

                {/* DIVIDER: OR */}
                <div className="relative flex items-center justify-center my-3">
                  <div className="border-t border-slate-200 dark:border-slate-700 w-full"></div>
                  <span className="bg-white dark:bg-[#131D2E] px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
                    or
                  </span>
                  <div className="border-t border-slate-200 dark:border-slate-700 w-full"></div>
                </div>

                {/* GOOGLE SIGN UP BUTTON */}
                <GoogleAuthButton
                  mode="signup"
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  disabled={loading || googleLoading}
                />

                <div className="pt-2 text-center text-xs text-slate-600 dark:text-slate-400">
                  Already have an account?{' '}
                  <Link to="/login" className="font-bold text-[#F97360] hover:text-[#e05e4b] hover:underline">
                    Sign In
                  </Link>
                </div>
              </>
            )}

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
