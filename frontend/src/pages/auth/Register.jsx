import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth';
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
  Phone,
  ArrowRight,
  RefreshCw,
  Sparkles,
  KeyRound,
} from 'lucide-react';
import { PhoneInput } from '../../components/common/PhoneInput';
import { GoogleAuthButton } from '../../components/common/GoogleAuthButton';
import { GoogleOnboardingModal } from '../../components/auth/GoogleOnboardingModal';

export const Register = () => {
  const [searchParams] = useSearchParams();
  const initialRoleParam = searchParams.get('role');
  const [selectedRole, setSelectedRole] = useState(
    initialRoleParam === 'HOST' || initialRoleParam === 'PROVIDER' ? 'PROVIDER' : 'CUSTOMER'
  );

  useEffect(() => {
    if (initialRoleParam === 'HOST' || initialRoleParam === 'PROVIDER') {
      setSelectedRole('PROVIDER');
    }
  }, [initialRoleParam]);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Host Verification Lifecycle States: 'FORM' | 'PHONE_OTP' | 'EMAIL_VERIFY' | 'VERIFIED'
  const [hostStep, setHostStep] = useState('FORM');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  // OTP Timers & States
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccessMsg, setOtpSuccessMsg] = useState('');

  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // Google OAuth state
  const [googleOnboardingData, setGoogleOnboardingData] = useState(null);
  const [googleCredential, setGoogleCredential] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  const { register, googleAuth, login } = useAuth();
  const navigate = useNavigate();

  // Resend Cooldown Timer
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

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
    if (!isPhoneValid) return 'Please enter a valid 10-digit Indian phone number.';
    return '';
  };

  const getBusinessNameError = () => {
    if (selectedRole !== 'PROVIDER' || !touched.businessName) return '';
    if (!businessName.trim() || businessName.trim().length < 2) {
      return 'Please enter your property or brand name.';
    }
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
      setError('Please enter a valid 10-digit Indian mobile number.');
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

      if (selectedRole === 'PROVIDER') {
        // Transition Host to Phone OTP step
        setHostStep('PHONE_OTP');
        setResendCooldown(30);
        setOtpSuccessMsg(`A 6-digit verification code was sent to ${phone.trim()}.`);
      } else {
        // Customer direct registration success
        setSuccessData({
          email: email.toLowerCase().trim(),
          role: selectedRole,
          message: res.message || 'Your Voyara account has been created successfully.',
        });
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  // Host Phone OTP Verification
  const handleVerifyPhoneOtp = async (e) => {
    if (e) e.preventDefault();
    setOtpError('');
    setOtpSuccessMsg('');

    if (!phoneOtp || phoneOtp.trim().length !== 6) {
      setOtpError('Please enter the 6-digit OTP sent to your phone.');
      return;
    }

    setOtpLoading(true);
    try {
      const res = await authApi.verifyPhoneOtp(phone.trim(), phoneOtp.trim());
      setPhoneVerified(true);
      setOtpSuccessMsg('Phone verified successfully!');
      
      // Move to Email verification step
      setTimeout(() => {
        setHostStep('EMAIL_VERIFY');
        setPhoneOtp('');
        setOtpSuccessMsg(`Verification code sent to ${email.toLowerCase().trim()}.`);
      }, 800);
    } catch (err) {
      setOtpError(err.message || 'Invalid verification code. Please check and try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendPhoneOtp = async () => {
    if (resendCooldown > 0) return;
    setOtpError('');
    setOtpLoading(true);
    try {
      await authApi.resendPhoneOtp(phone.trim());
      setResendCooldown(30);
      setOtpSuccessMsg(`A new OTP has been sent to ${phone.trim()}.`);
    } catch (err) {
      setOtpError(err.message || 'Failed to resend phone OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Host Email Verification
  const handleVerifyEmail = async (e) => {
    if (e) e.preventDefault();
    setOtpError('');
    setOtpSuccessMsg('');

    if (!emailCode || emailCode.trim().length < 6) {
      setOtpError('Please enter the 6-digit verification code from your email.');
      return;
    }

    setOtpLoading(true);
    try {
      const res = await authApi.verifyEmail(email.toLowerCase().trim(), emailCode.trim());
      setEmailVerified(true);
      setOtpSuccessMsg('Email verified successfully!');
      
      // Complete host verification
      setTimeout(() => {
        setHostStep('VERIFIED');
      }, 800);
    } catch (err) {
      setOtpError(err.message || 'Invalid email verification code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setOtpError('');
    setOtpLoading(true);
    try {
      await authApi.sendEmailVerification(email.toLowerCase().trim());
      setOtpSuccessMsg(`Verification code resent to ${email.toLowerCase().trim()}.`);
    } catch (err) {
      setOtpError(err.message || 'Failed to resend email verification code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleContinueToDashboard = async () => {
    try {
      // Auto sign-in or navigate to login
      await login({ email: email.toLowerCase().trim(), password });
      navigate('/provider');
    } catch (err) {
      navigate('/login', {
        state: {
          registeredEmail: email.toLowerCase().trim(),
          registeredSuccess: true,
        },
      });
    }
  };

  const handleGoogleSuccess = async (credential) => {
    setGoogleCredential(credential);
    setError('');
    setGoogleError('');
    setGoogleLoading(true);

    try {
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

  return (
    <div className="min-h-screen bg-[#FFFDF7] dark:bg-[#091B29] py-6 sm:py-10 px-3 sm:px-6 lg:px-8 flex flex-col justify-center items-center font-sans overflow-x-hidden transition-colors">
      <div className="w-full max-w-5xl bg-white dark:bg-[#0F273D] rounded-3xl shadow-2xl border border-[#E0ECEF] dark:border-white/10 overflow-hidden grid grid-cols-1 lg:grid-cols-12 my-auto">
        
        {/* LEFT COLUMN: Hero Visual & Benefits */}
        <div className="lg:col-span-5 relative hidden lg:flex flex-col justify-between p-8 sm:p-10 text-white overflow-hidden min-h-[600px]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=85')`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#091B29] via-[#091B29]/70 to-[#091B29]/45" />

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
              <span className="text-[#F6C945] text-xs font-black uppercase tracking-widest block">
                Find Your Place.
              </span>
              <p className="text-white/80 text-sm font-medium pt-0.5">
                Stay. Explore. Experience.
              </p>
            </div>
          </div>

          {/* Host Trust Badges */}
          <div className="relative z-10 space-y-3 my-auto pt-10">
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-start space-x-3.5 shadow-lg text-white">
              <div className="p-2 bg-[#087F8C]/40 rounded-xl text-[#F6C945] shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4 text-[#F6C945]" />
              </div>
              <div>
                <h4 className="text-xs font-bold tracking-wide">Multi-Signal Trust</h4>
                <p className="text-[11px] text-white/70 leading-snug">Evaluates stay partner & property signals with zero legal document uploads.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-start space-x-3.5 shadow-lg text-white">
              <div className="p-2 bg-[#F97316]/30 rounded-xl text-[#F97316] shrink-0 mt-0.5">
                <Phone className="w-4 h-4 text-[#F97316]" />
              </div>
              <div>
                <h4 className="text-xs font-bold tracking-wide">Verified Stay Partner Identity</h4>
                <p className="text-[11px] text-white/70 leading-snug">Secure phone & email validation prior to property listing.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-start space-x-3.5 shadow-lg text-white">
              <div className="p-2 bg-[#35A66F]/30 rounded-xl text-[#DDF3E7] shrink-0 mt-0.5">
                <CalendarCheck className="w-4 h-4 text-[#35A66F]" />
              </div>
              <div>
                <h4 className="text-xs font-bold tracking-wide">VeriNova Integrity</h4>
                <p className="text-[11px] text-white/70 leading-snug">Real-time database checks protect every booking transaction.</p>
              </div>
            </div>
          </div>

          {/* Footer Copyright */}
          <div className="relative z-10 pt-4 border-t border-white/10 text-[11px] text-white/60">
            © {new Date().getFullYear()} Voyara Inc. Find Your Place.
          </div>
        </div>

        {/* RIGHT COLUMN: Form & Verification Wizard */}
        <div className="lg:col-span-7 p-6 sm:p-8 md:p-10 lg:p-12 flex flex-col justify-center bg-white dark:bg-[#0F273D]">
          <div className="max-w-md w-full mx-auto space-y-5">
            
            {/* STEP: CUSTOMER DIRECT SUCCESS */}
            {successData ? (
              <div className="space-y-6 text-center py-6 animate-in fade-in-50 zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-[#DDF3E7] dark:bg-emerald-950/40 border border-[#35A66F]/40 rounded-full flex items-center justify-center mx-auto text-[#35A66F] shadow-sm">
                  <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-bold font-serif text-[#17324D] dark:text-white">
                    Account Created Successfully
                  </h2>
                  <p className="text-sm text-[#607080] dark:text-slate-300 max-w-sm mx-auto">
                    Account registered for <strong className="text-[#17324D] dark:text-white">{successData.email}</strong> as{' '}
                    <span className="font-semibold text-[#087F8C] dark:text-[#27B7A8]">
                      Traveler
                    </span>.
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Please sign in with your email and password to start exploring stays.
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
                    className="w-full py-3.5 px-6 bg-[#F97316] hover:bg-[#FF8A3D] text-white font-bold rounded-xl shadow-md shadow-orange-950/20 transition-all text-sm cursor-pointer font-sans"
                  >
                    Continue to Sign In
                  </button>
                </div>
              </div>

            ) : hostStep === 'PHONE_OTP' ? (
              /* STEP: HOST PHONE OTP VERIFICATION */
              <div className="space-y-5 animate-in fade-in-50 zoom-in-95 duration-200">
                {/* Progress tracker */}
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[#F97316] flex items-center space-x-1">
                    <span className="w-5 h-5 rounded-full bg-[#F97316] text-white flex items-center justify-center text-[10px]">1</span>
                    <span>Verify Phone</span>
                  </span>
                  <span className="text-slate-300">→</span>
                  <span>2. Verify Email</span>
                  <span className="text-slate-300">→</span>
                  <span>3. Active Stay Partner</span>
                </div>

                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 flex items-center justify-center mx-auto text-[#F97316]">
                    <Phone className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-bold font-serif text-[#17324D] dark:text-white">
                    VERIFY YOUR PHONE
                  </h2>
                  <p className="text-xs text-[#607080] dark:text-slate-400">
                    Enter the 6-digit OTP sent to <strong className="text-slate-700 dark:text-slate-200">{phone}</strong>
                  </p>
                </div>

                {otpError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center space-x-2 text-rose-700 dark:text-rose-300 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{otpError}</span>
                  </div>
                )}

                {otpSuccessMsg && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center space-x-2 text-emerald-700 dark:text-emerald-300 text-xs">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{otpSuccessMsg}</span>
                  </div>
                )}

                <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Phone OTP Code
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                      <input
                        type="text"
                        maxLength={6}
                        autoFocus
                        placeholder="• • • • • •"
                        data-testid="otp-input"
                        value={phoneOtp}
                        onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-lg font-mono tracking-widest text-[#17324D] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    data-testid="verify-otp-button"
                    disabled={otpLoading || phoneOtp.length !== 6}
                    className="w-full py-3.5 px-4 bg-[#F97316] hover:bg-[#FF8A3D] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer disabled:opacity-50"
                  >
                    {otpLoading ? (
                      <span>Verifying OTP...</span>
                    ) : (
                      <>
                        <span>Verify Phone OTP</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
                    <span>Didn't receive the OTP?</span>
                    <button
                      type="button"
                      data-testid="resend-otp-button"
                      onClick={handleResendPhoneOtp}
                      disabled={resendCooldown > 0 || otpLoading}
                      className="font-bold text-[#087F8C] dark:text-[#27B7A8] hover:underline disabled:opacity-50 cursor-pointer"
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                    </button>
                  </div>
                </form>
              </div>

            ) : hostStep === 'EMAIL_VERIFY' ? (
              /* STEP: HOST EMAIL VERIFICATION */
              <div className="space-y-5 animate-in fade-in-50 zoom-in-95 duration-200">
                {/* Progress tracker */}
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-emerald-600 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Phone Verified</span>
                  </span>
                  <span className="text-slate-300">→</span>
                  <span className="text-[#087F8C] flex items-center space-x-1">
                    <span className="w-5 h-5 rounded-full bg-[#087F8C] text-white flex items-center justify-center text-[10px]">2</span>
                    <span>Verify Email</span>
                  </span>
                  <span className="text-slate-300">→</span>
                  <span>3. Active Stay Partner</span>
                </div>

                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-center mx-auto text-[#087F8C]">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-bold font-serif text-[#17324D] dark:text-white">
                    VERIFY YOUR EMAIL
                  </h2>
                  <p className="text-xs text-[#607080] dark:text-slate-400">
                    Check your email at <strong className="text-slate-700 dark:text-slate-200">{email}</strong> for the 6-digit code.
                  </p>
                </div>

                {otpError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center space-x-2 text-rose-700 dark:text-rose-300 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{otpError}</span>
                  </div>
                )}

                {otpSuccessMsg && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center space-x-2 text-emerald-700 dark:text-emerald-300 text-xs">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{otpSuccessMsg}</span>
                  </div>
                )}

                <form onSubmit={handleVerifyEmail} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Email Verification Code
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                      <input
                        type="text"
                        maxLength={6}
                        autoFocus
                        placeholder="• • • • • •"
                        data-testid="email-otp-input"
                        value={emailCode}
                        onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-lg font-mono tracking-widest text-[#17324D] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#087F8C]/20 focus:border-[#087F8C] transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    data-testid="verify-email-button"
                    disabled={otpLoading || emailCode.length < 6}
                    className="w-full py-3.5 px-4 bg-[#087F8C] hover:bg-[#076F7B] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer disabled:opacity-50"
                  >
                    {otpLoading ? (
                      <span>Verifying Email...</span>
                    ) : (
                      <>
                        <span>Verify Email</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
                    <span>Didn't receive the email code?</span>
                    <button
                      type="button"
                      data-testid="resend-email-button"
                      onClick={handleResendEmail}
                      disabled={otpLoading}
                      className="font-bold text-[#087F8C] dark:text-[#27B7A8] hover:underline cursor-pointer"
                    >
                      Resend Code
                    </button>
                  </div>
                </form>
              </div>

            ) : hostStep === 'VERIFIED' ? (
              /* STEP: HOST FULLY VERIFIED SUCCESS */
              <div className="space-y-6 text-center py-6 animate-in fade-in-50 zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-[#DDF3E7] dark:bg-emerald-950/40 border border-[#35A66F]/40 rounded-full flex items-center justify-center mx-auto text-[#35A66F] shadow-sm">
                  <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-bold font-serif text-[#17324D] dark:text-white">
                    Stay Partner Account Verified Successfully
                  </h2>
                  <p className="text-xs text-[#607080] dark:text-slate-300 max-w-sm mx-auto">
                    Both your phone number and email address have been verified according to Voyara stay partner safety standards.
                  </p>
                </div>

                {/* Verification badges */}
                <div className="bg-[#FFFDF7] dark:bg-[#091B29] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs text-left max-w-sm mx-auto">
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/40 dark:border-slate-800">
                    <span className="text-slate-500">Phone ({phone})</span>
                    <span className="text-[#35A66F] font-bold flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verified</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/40 dark:border-slate-800">
                    <span className="text-slate-500">Email ({email})</span>
                    <span className="text-[#35A66F] font-bold flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verified</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500">Stay Partner Verification</span>
                    <span className="text-[#087F8C] font-bold flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Completed</span>
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleContinueToDashboard}
                    className="w-full py-3.5 px-6 bg-[#F97316] hover:bg-[#FF8A3D] text-white font-bold rounded-xl shadow-md shadow-orange-950/20 transition-all text-sm cursor-pointer font-sans flex items-center justify-center space-x-2"
                  >
                    <span>CONTINUE TO STAY PARTNER DASHBOARD</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

            ) : (
              /* REGISTRATION FORM STATE */
              <>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black font-serif text-[#17324D] dark:text-white">
                    Find your place.
                  </h1>
                  <p className="mt-1 text-xs sm:text-sm text-[#607080] dark:text-slate-400 font-light">
                    Join Voyara to book verified stays or share your hospitality space.
                  </p>
                </div>

                {/* Role Selector: "I am a" */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Account Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedRole('CUSTOMER')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start space-x-3 ${
                        selectedRole === 'CUSTOMER'
                          ? 'bg-[#087F8C] text-white border-transparent shadow-md'
                          : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${selectedRole === 'CUSTOMER' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                        <Luggage className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block text-xs font-bold uppercase tracking-wide">TRAVELER</span>
                        <span className={`block text-[10px] mt-0.5 leading-tight ${selectedRole === 'CUSTOMER' ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}>
                          Book verified stays & experiences.
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedRole('PROVIDER')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start space-x-3 ${
                        selectedRole === 'PROVIDER'
                          ? 'bg-[#F97316] text-white border-transparent shadow-md'
                          : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${selectedRole === 'PROVIDER' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                        <Home className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block text-xs font-bold uppercase tracking-wide">STAY PARTNER</span>
                        <span className={`block text-[10px] mt-0.5 leading-tight ${selectedRole === 'PROVIDER' ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}>
                          Share your property with travelers.
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
                        className={`w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-sm text-[#17324D] dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#087F8C]/20 focus:border-[#087F8C] transition-all ${
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
                        className={`w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-sm text-[#17324D] dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#087F8C]/20 focus:border-[#087F8C] transition-all ${
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
                      Phone Number {selectedRole === 'PROVIDER' && <span className="text-[#F97316]">(OTP Verification Required)</span>}
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
                        Property / Brand Name
                      </label>
                      <div className="relative">
                        <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                        <input
                          id="register-business-name"
                          type="text"
                          required
                          placeholder="e.g. Misty Hills Eco Resort & Homestay"
                          value={businessName}
                          onChange={(e) => {
                            setBusinessName(e.target.value);
                            if (error) setError('');
                          }}
                          onBlur={() => setTouched((p) => ({ ...p, businessName: true }))}
                          className={`w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-sm text-[#17324D] dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#087F8C]/20 focus:border-[#087F8C] transition-all ${
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
                        className={`w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-sm text-[#17324D] dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                          password.length > 0
                            ? isPasswordValid
                              ? 'border-[#35A66F] ring-2 ring-emerald-100 focus:border-[#35A66F]'
                              : 'border-[#F6C945] ring-2 ring-amber-100 focus:border-[#F6C945]'
                            : touched.password
                            ? 'border-rose-400 ring-2 ring-rose-100'
                            : 'border-slate-200 dark:border-slate-700 focus:ring-[#087F8C]/20 focus:border-[#087F8C]'
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
                        <div className="mt-1.5 flex items-center space-x-1.5 text-xs text-[#236C48] dark:text-emerald-400 font-medium animate-in fade-in-50">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#35A66F] shrink-0" />
                          <span>Password meets all strength requirements</span>
                        </div>
                      ) : (
                        <div className="mt-1.5 flex items-start space-x-1.5 text-xs text-amber-700 dark:text-amber-400 font-medium animate-in fade-in-50">
                          <AlertCircle className="w-3.5 h-3.5 text-[#F6C945] shrink-0 mt-0.5" />
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
                        className={`w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-sm text-[#17324D] dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                          confirmPassword.length > 0
                            ? passwordsMatch
                              ? 'border-[#35A66F] ring-2 ring-emerald-100 focus:border-[#35A66F]'
                              : 'border-rose-400 ring-2 ring-rose-100 focus:border-rose-500'
                            : touched.confirmPassword
                            ? 'border-rose-400 ring-2 ring-rose-100'
                            : 'border-slate-200 dark:border-slate-700 focus:ring-[#087F8C]/20 focus:border-[#087F8C]'
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
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 bg-[#F97316] hover:bg-[#FF8A3D] active:scale-[0.99] text-white font-bold rounded-xl shadow-md shadow-orange-950/20 transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer disabled:opacity-50 mt-4 font-sans"
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Creating account...</span>
                      </div>
                    ) : (
                      <span>{selectedRole === 'PROVIDER' ? 'Continue to Stay Partner Verification' : 'Create Account'}</span>
                    )}
                  </button>
                </form>

                {/* DIVIDER: OR */}
                <div className="relative flex items-center justify-center my-3">
                  <div className="border-t border-slate-200 dark:border-slate-700 w-full"></div>
                  <span className="bg-white dark:bg-[#0F273D] px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
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
                  <Link to="/login" className="font-bold text-[#087F8C] dark:text-[#27B7A8] hover:underline">
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
