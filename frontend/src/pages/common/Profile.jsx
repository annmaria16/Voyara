import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth';
import { uploadApi } from '../../api/upload';
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  KeyRound,
  Calendar,
  CheckCircle2,
  Camera,
  Upload,
  MapPin,
  Globe,
  DollarSign,
  Heart,
  Lock,
  Sparkles,
  AlertCircle,
  Save,
  Check,
  Trash2,
  Info,
  Eye,
  EyeOff,
  Building,
} from 'lucide-react';

export const ProfilePage = () => {
  const { user, roleLabel, updateUserProfile } = useAuth();

  // Profile fields state
  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [currency, setCurrency] = useState(user?.preferred_currency || 'INR');
  const [language, setLanguage] = useState(user?.preferred_language || 'English');
  const [selectedStyles, setSelectedStyles] = useState(
    user?.travel_styles ? user.travel_styles.split(',').filter(Boolean) : ['Hill Stations & Mountain Treks', 'Eco & Nature Retreats']
  );

  // Upload & Save state
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAvatarUrl(user.avatar_url || '');
      setBio(user.bio || '');
      setLocation(user.location || '');
      setCurrency(user.preferred_currency || 'INR');
      setLanguage(user.preferred_language || 'English');
      if (user.travel_styles) {
        setSelectedStyles(user.travel_styles.split(',').filter(Boolean));
      }
    }
  }, [user]);

  const travelStyleOptions = [
    { id: 'Hill Stations & Mountain Treks', label: 'Hill Stations & Treks', icon: '🏔️' },
    { id: 'Seaside & Cliff Villas', label: 'Seaside & Beach Villas', icon: '🏖️' },
    { id: 'Eco & Nature Retreats', label: 'Eco & Nature Stays', icon: '🌿' },
    { id: 'Heritage & Cultural Stays', label: 'Heritage & Culture', icon: '🏛️' },
    { id: 'Acoustic Campfires & Glamping', label: 'Campfire & Glamping', icon: '🔥' },
    { id: 'Local Culinary & Spice Trails', label: 'Culinary & Local Food', icon: '🍲' },
    { id: 'Kayaking & Water Adventures', label: 'Water Adventures', icon: '🛶' },
    { id: 'Luxury & Wellness Retreats', label: 'Luxury & Wellness', icon: '🧖' },
  ];

  const toggleStyle = (styleId) => {
    setSelectedStyles((prev) =>
      prev.includes(styleId) ? prev.filter((s) => s !== styleId) : [...prev, styleId]
    );
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileError('Please choose a valid image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Image file size must be less than 5MB.');
      return;
    }

    setUploadingPhoto(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const uploadRes = await uploadApi.uploadImage(file);
      const newUrl = uploadRes.url;
      setAvatarUrl(newUrl);

      // Auto-save the new avatar to backend profile
      const updatedUser = await authApi.updateProfile({
        name: name.trim() || user?.name,
        avatar_url: newUrl,
        bio,
        location,
        preferred_currency: currency,
        preferred_language: language,
        travel_styles: selectedStyles.join(','),
      });

      updateUserProfile(updatedUser);
      setProfileSuccess('Profile photo updated successfully!');
      setTimeout(() => setProfileSuccess(''), 4000);
    } catch (err) {
      setProfileError(err.message || 'Failed to upload profile photo.');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    setUploadingPhoto(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      setAvatarUrl('');
      const updatedUser = await authApi.updateProfile({
        name: name.trim() || user?.name,
        avatar_url: '',
        bio,
        location,
        preferred_currency: currency,
        preferred_language: language,
        travel_styles: selectedStyles.join(','),
      });

      updateUserProfile(updatedUser);
      setProfileSuccess('Profile photo removed.');
      setTimeout(() => setProfileSuccess(''), 4000);
    } catch (err) {
      setProfileError(err.message || 'Failed to remove photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setProfileError('Full name must be at least 2 characters long.');
      return;
    }

    setSavingProfile(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const updatedUser = await authApi.updateProfile({
        name: name.trim(),
        avatar_url: avatarUrl,
        bio: bio.trim(),
        location: location.trim(),
        preferred_currency: currency,
        preferred_language: language,
        travel_styles: selectedStyles.join(','),
      });

      updateUserProfile(updatedUser);
      setProfileSuccess('Profile details saved successfully!');
      setTimeout(() => setProfileSuccess(''), 4000);
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      setPasswordSuccess(res.message || 'Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 5000);
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const formattedJoinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'September 2026';

  const avatarFullUrl = avatarUrl
    ? avatarUrl.startsWith('http')
      ? avatarUrl
      : `http://localhost:8000${avatarUrl}`
    : null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* 1. Header Profile Banner */}
      <div className="relative bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm overflow-hidden">
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#087F8C]/15 via-orange-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start space-y-6 sm:space-y-0 sm:space-x-8">
          {/* Avatar with Camera Trigger */}
          <div className="relative group shrink-0">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden shadow-lg border-4 border-white dark:border-slate-800 bg-gradient-to-tr from-[#087F8C] via-[#0F9D9A] to-orange-500 flex items-center justify-center text-white font-black text-4xl uppercase relative">
              {avatarFullUrl ? (
                <img
                  src={avatarFullUrl}
                  alt={name || user?.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{name ? name.charAt(0) : user?.name?.charAt(0) || 'U'}</span>
              )}

              {/* Uploading Overlay Spinner */}
              {uploadingPhoto && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                  <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Camera Floating Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              title="Upload profile photo"
              className="absolute -bottom-2 -right-2 p-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-[#EA580C] hover:from-orange-600 hover:to-[#EA580C] text-white shadow-md transition-transform hover:scale-105 active:scale-95 flex items-center justify-center border-2 border-white dark:border-slate-800 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
          </div>

          {/* User Details & Identity Badges */}
          <div className="flex-1 text-center sm:text-left space-y-3">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black font-serif text-[#091B29] dark:text-white">
                {name || user?.name || 'Voyara User'}
              </h1>
              <span className="px-3 py-1 rounded-xl bg-[#087F8C]/10 text-[#087F8C] dark:text-[#27B7A8] text-xs font-black uppercase tracking-wider border border-[#087F8C]/20">
                {roleLabel || user?.role || 'Traveler'}
              </span>
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified Account</span>
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-300 max-w-xl leading-relaxed font-light">
              {bio || 'Verified member of the Voyara community. Discover and book authentic stays, retreats, and guided local experiences.'}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-[#087F8C]" />
                <span>Member since {formattedJoinDate}</span>
              </span>
              {location && (
                <span className="inline-flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-orange-500" />
                  <span>{location}</span>
                </span>
              )}
            </div>

            {/* Quick Photo Actions */}
            <div className="flex items-center justify-center sm:justify-start gap-3 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-[#087F8C]/10 text-xs font-semibold text-[#091B29] dark:text-white hover:text-[#087F8C] transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700"
              >
                <Upload className="w-3.5 h-3.5 text-[#087F8C]" />
                <span>Change Photo</span>
              </button>

              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={uploadingPhoto}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Photo</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Form Alerts */}
      {profileSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{profileSuccess}</span>
        </div>
      )}

      {profileError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{profileError}</span>
        </div>
      )}

      {/* 2. Main Profile Edit Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Section A: Personal Information & Verified Credentials */}
        <div className="bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold font-serif text-[#091B29] dark:text-white flex items-center space-x-2">
                <User className="w-5 h-5 text-[#087F8C]" />
                <span>Account Information</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Update your display name and personalize your public profile.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Editable Full Name */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                <span>Full Name</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Editable</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-[#087F8C] transition-all"
                />
              </div>
            </div>

            {/* Readonly Email Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                <span>Email Address</span>
                <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Readonly</span>
                </span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={user?.email || ''}
                  readOnly
                  disabled
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-not-allowed select-all"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Primary verified email for account security and booking updates.
              </p>
            </div>

            {/* Readonly Phone Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                <span>Phone Number</span>
                <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Readonly</span>
                </span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={user?.phone || 'Not provided'}
                  readOnly
                  disabled
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-not-allowed select-all"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Verified phone used for host communication and reservation alerts.
              </p>
            </div>

            {/* Location / City */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Hometown / Location
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Kochi, Kerala, India"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:border-[#087F8C] transition-all"
                />
              </div>
            </div>

            {/* Bio / Traveler Story */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                About / Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Share a short note about your travel style, favorite escapes, or hosting philosophy..."
                className="w-full px-4 py-3 rounded-2xl bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-[#087F8C] transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Section B: Preferences & Regional Settings */}
        <div className="bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold font-serif text-[#091B29] dark:text-white flex items-center space-x-2">
                <Globe className="w-5 h-5 text-orange-500" />
                <span>Regional & Travel Preferences</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Customize currency, language, and the types of stays and experiences you love.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Preferred Currency */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center space-x-1">
                <DollarSign className="w-3.5 h-3.5 text-[#087F8C]" />
                <span>Display Currency</span>
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-[#087F8C]"
              >
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
                <option value="AED">AED (د.إ) - UAE Dirham</option>
              </select>
            </div>

            {/* Preferred Language */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center space-x-1">
                <Globe className="w-3.5 h-3.5 text-orange-500" />
                <span>Preferred Language</span>
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-orange-500"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi (हिंदी)</option>
                <option value="Malayalam">Malayalam (മലയാളം)</option>
                <option value="Spanish">Spanish (Español)</option>
                <option value="French">French (Français)</option>
                <option value="German">German (Deutsch)</option>
              </select>
            </div>

            {/* Travel Interests Tag Selection */}
            <div className="space-y-3 md:col-span-2 pt-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-[#087F8C]" />
                <span>Favorite Stay Styles & Adventure Interests</span>
              </label>
              <div className="flex flex-wrap gap-2.5">
                {travelStyleOptions.map((opt) => {
                  const isSelected = selectedStyles.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleStyle(opt.id)}
                      className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] text-white shadow-sm shadow-teal-500/20 scale-[1.02]'
                          : 'bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-[#087F8C]'
                      }`}
                    >
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Save Profile Button */}
          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-[#EA580C] hover:from-orange-600 hover:to-[#EA580C] text-white text-xs font-bold rounded-2xl shadow-md shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {savingProfile ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Profile Details</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* 3. Security & Password Management */}
      <div className="bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold font-serif text-[#091B29] dark:text-white flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-[#087F8C]" />
              <span>Password & Security</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Change your login password to keep your Voyara account protected.
            </p>
          </div>
        </div>

        {passwordSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Current Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-[#087F8C]"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-[#087F8C]"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-[#087F8C]"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-[#EA580C] hover:from-orange-600 hover:to-[#EA580C] text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {savingPassword ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 4. VeriNova Verification & Trust Summary */}
      <div className="bg-gradient-to-r from-[#091B29] via-[#0F273D] to-[#091B29] border border-teal-900/40 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#087F8C]/20 text-xs font-bold text-[#27B7A8] border border-[#087F8C]/30">
              <ShieldCheck className="w-4 h-4" />
              <span>VeriNova Verified Member</span>
            </div>
            <h3 className="text-lg font-bold font-serif">Trust & Protection Standards</h3>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed font-light">
              Your account identity is verified and protected by the VeriNova Transaction Verification engine. Double bookings and fraudulent listings are automatically audited in real time.
            </p>
          </div>

          <div className="shrink-0 p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-center space-y-1">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Trust Rating</p>
            <p className="text-2xl font-black text-[#27B7A8]">100%</p>
            <p className="text-[10px] text-emerald-400 font-semibold">Active & Audited</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
