import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { customerApi } from '../../api/customer';
import { providerApi } from '../../api/provider';
import { adminApi } from '../../api/admin';
import { NotificationBell } from '../notifications/NotificationBell';
import {
  Search,
  Menu,
  Sun,
  Moon,
  LogOut,
  User,
  Home,
  BedDouble,
  Flame,
  Calendar,
  Star,
  Users,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const DashboardHeader = ({
  title = 'DASHBOARD',
  onMenuClick = () => {},
  placeholder,
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [liveResults, setLiveResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showLiveDropdown, setShowLiveDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const searchDropdownRef = useRef(null);
  const profileMenuRef = useRef(null);
  const debounceTimer = useRef(null);

  const role = user?.role || 'CUSTOMER';

  // Role-specific dynamic placeholder text
  const resolvedPlaceholder =
    placeholder ||
    (role === 'PROVIDER'
      ? 'Search your properties, rooms, bookings...'
      : role === 'ADMIN'
      ? 'Search users, properties, bookings...'
      : 'Search destinations, stays, experiences...');

  // Role-specific search header title inside dropdown
  const dropdownHeaderTitle =
    role === 'PROVIDER'
      ? 'Stay Partner Portfolio & Management'
      : role === 'ADMIN'
      ? 'Control Center Platform Records'
      : 'Live Stays & Destinations';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target)) {
        setShowLiveDropdown(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleQueryChange = (val) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setLiveResults([]);
      setShowLiveDropdown(false);
      return;
    }

    setShowLiveDropdown(true);
    setIsSearching(true);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        const query = val.trim();
        if (role === 'PROVIDER') {
          const results = await providerApi.search(query);
          setLiveResults(Array.isArray(results) ? results : []);
        } else if (role === 'ADMIN') {
          const results = await adminApi.search(query);
          setLiveResults(Array.isArray(results) ? results : []);
        } else {
          const results = await customerApi.searchProperties({ destination: query });
          setLiveResults(Array.isArray(results) ? results.slice(0, 6) : []);
        }
      } catch (err) {
        console.error('Search error:', err);
        setLiveResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 150);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setShowLiveDropdown(false);
    if (role === 'PROVIDER') {
      if (liveResults.length > 0 && liveResults[0]?.route) {
        navigate(liveResults[0].route);
      } else {
        navigate('/provider/properties');
      }
    } else if (role === 'ADMIN') {
      if (liveResults.length > 0 && liveResults[0]?.route) {
        navigate(liveResults[0].route);
      } else {
        navigate('/admin/properties');
      }
    } else {
      navigate(`/search?destination=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSelectResult = (item) => {
    setShowLiveDropdown(false);
    if (role === 'PROVIDER') {
      // Strictly navigate to provider management page, never to traveler public page
      const targetRoute = item.route || '/provider/properties';
      navigate(targetRoute);
    } else if (role === 'ADMIN') {
      // Strictly navigate within admin routes
      const targetRoute = item.route || '/admin/dashboard';
      navigate(targetRoute);
    } else {
      // Customer / Traveler navigation
      navigate(`/properties/${item.id}`);
    }
  };

  const handleSubActionClick = (route, e) => {
    e.stopPropagation();
    setShowLiveDropdown(false);
    navigate(route);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Badge icon helper
  const getBadgeIcon = (type) => {
    switch (type) {
      case 'PROPERTY':
        return <Home className="w-3 h-3" />;
      case 'ROOM':
        return <BedDouble className="w-3 h-3" />;
      case 'EXPERIENCE':
        return <Flame className="w-3 h-3" />;
      case 'BOOKING':
        return <Calendar className="w-3 h-3" />;
      case 'REVIEW':
        return <Star className="w-3 h-3 text-amber-400 fill-amber-400" />;
      case 'AVAILABILITY':
        return <Calendar className="w-3 h-3" />;
      case 'USER':
        return <Users className="w-3 h-3" />;
      case 'VERIFICATION':
        return <ShieldCheck className="w-3 h-3" />;
      default:
        return <Sparkles className="w-3 h-3" />;
    }
  };

  // Badge color class helper
  const getBadgeClasses = (type) => {
    switch (type) {
      case 'PROPERTY':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'ROOM':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'EXPERIENCE':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
      case 'BOOKING':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      case 'REVIEW':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'AVAILABILITY':
        return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20';
      case 'USER':
        return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
      case 'VERIFICATION':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#FFFDF7]/95 dark:bg-[#091B29]/95 backdrop-blur-md border-b border-[#E0ECEF] dark:border-white/10 px-4 sm:px-8 py-3.5 select-none transition-colors duration-200 shadow-xs shrink-0">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Mobile menu toggle & Page Title */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-[#087F8C] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-sm sm:text-base font-black font-serif tracking-wider text-[#17324D] dark:text-white uppercase">
            {title}
          </h2>
        </div>

        {/* Right: Actions, Role-Aware Search, Theme Switcher, Notifications, Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Real-time Role-Aware Search Dock */}
          <div ref={searchDropdownRef} className="hidden md:block relative w-56 lg:w-80">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleQueryChange(e.target.value)}
                onFocus={() => searchQuery.trim() && setShowLiveDropdown(true)}
                placeholder={resolvedPlaceholder}
                className="w-full pl-8 pr-7 py-1.5 bg-white dark:bg-[#0F273D] border border-[#E0ECEF] dark:border-white/10 focus:border-[#087F8C] dark:focus:border-[#27B7A8] rounded-xl text-xs text-[#17324D] dark:text-white placeholder-slate-400 focus:outline-hidden transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setLiveResults([]);
                    setShowLiveDropdown(false);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </form>

            {/* Live Real-Time Search Results Dropdown */}
            {showLiveDropdown && searchQuery.trim() && (
              <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-[#0F273D] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2 z-50 text-xs space-y-1.5 max-h-96 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100 min-w-[320px]">
                <div className="px-2 py-1 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                  <span>{dropdownHeaderTitle}</span>
                  {isSearching && <span className="text-[#35A66F] font-semibold animate-pulse">Searching...</span>}
                </div>

                {liveResults.length === 0 && !isSearching ? (
                  <div className="p-4 text-center text-slate-500 dark:text-slate-400 space-y-1">
                    <p className="font-semibold text-xs text-slate-700 dark:text-slate-200">
                      {role === 'PROVIDER'
                        ? 'No matching records in your portfolio'
                        : role === 'ADMIN'
                        ? 'No matching platform records'
                        : 'No matching stays found'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {role === 'PROVIDER'
                        ? 'Search property names, room types, booking numbers, or reviews'
                        : role === 'ADMIN'
                        ? 'Search users, stay names, or booking numbers'
                        : 'Try searching Munnar, Goa, Manali, or Villa'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Stay Partner & Admin Structured Results */}
                    {role === 'PROVIDER' || role === 'ADMIN' ? (
                      <div className="space-y-1.5">
                        {liveResults.map((item) => (
                          <div
                            key={`${item.type}-${item.id}`}
                            onClick={() => handleSelectResult(item)}
                            className="p-2.5 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50/90 dark:hover:bg-slate-800/80 cursor-pointer transition-all group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${getBadgeClasses(
                                      item.type
                                    )}`}
                                  >
                                    {getBadgeIcon(item.type)}
                                    {item.badge || item.type}
                                  </span>
                                  {item.property_name && item.type !== 'PROPERTY' && (
                                    <span className="text-[10px] text-slate-400 truncate">
                                      in {item.property_name}
                                    </span>
                                  )}
                                </div>
                                <p className="font-bold text-slate-900 dark:text-white group-hover:text-[#087F8C] dark:group-hover:text-[#27B7A8] transition-colors truncate text-xs">
                                  {item.title}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                                  {item.subtitle}
                                </p>
                              </div>

                              <div className="shrink-0 flex items-center self-center pl-2">
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#087F8C] dark:text-[#27B7A8] group-hover:translate-x-0.5 transition-transform">
                                  {item.action_label || 'Manage'}
                                  <ArrowRight className="w-3 h-3" />
                                </span>
                              </div>
                            </div>

                            {/* Contextual Sub-Action Shortcuts for Stay Partner Property Results */}
                            {role === 'PROVIDER' && item.type === 'PROPERTY' && Array.isArray(item.sub_actions) && (
                              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1">
                                {item.sub_actions.map((sub, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={(e) => handleSubActionClick(sub.route, e)}
                                    className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-[#087F8C] hover:text-white dark:hover:bg-[#087F8C] dark:hover:text-white text-slate-600 dark:text-slate-300 transition-colors"
                                  >
                                    {sub.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Customer / Traveler Discovery Results */
                      <div className="space-y-1">
                        {liveResults.map((stay) => {
                          const img =
                            stay.images?.[0]?.image_url ||
                            stay.image_url ||
                            'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=150&q=80';
                          const price = stay.rooms?.[0]?.base_price || stay.price || 4500;
                          return (
                            <div
                              key={stay.id}
                              onClick={() => handleSelectResult(stay)}
                              className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors group"
                            >
                              <img
                                src={img}
                                alt={stay.name}
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-slate-900 dark:text-white truncate group-hover:text-[#087F8C] transition-colors">
                                  {stay.name}
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                  {stay.city || 'Munnar'}, {stay.state || 'Kerala'} •{' '}
                                  <span className="font-bold text-[#F6C945]">
                                    {stay.review_count > 0 ? `★ ${stay.rating?.toFixed(1)}` : '★ New'}
                                  </span>
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-black text-xs text-[#F97316] font-serif">
                                  ₹{price.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        <button
                          type="button"
                          onClick={handleSearch}
                          className="w-full text-center py-2 mt-1 rounded-xl bg-[#DDF3E7] dark:bg-slate-800 text-[#087F8C] dark:text-[#27B7A8] font-bold text-[11px] hover:bg-[#087F8C] hover:text-white dark:hover:bg-[#087F8C] dark:hover:text-white transition-all cursor-pointer"
                        >
                          View all results for "{searchQuery}" →
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Theme Switcher Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-[#087F8C] hover:bg-white dark:hover:bg-slate-800 transition-colors border border-slate-200/80 dark:border-slate-800 cursor-pointer shadow-2xs"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <Moon className="w-4 h-4 text-[#27B7A8]" />
            ) : (
              <Sun className="w-4 h-4 text-[#F6C945]" />
            )}
          </button>

          {/* Real In-App Notification Bell */}
          <NotificationBell />

          {/* User Profile Dropdown */}
          <div ref={profileMenuRef} className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-2 p-1 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors focus:outline-hidden cursor-pointer"
            >
              {user?.avatar_url ? (
                <img
                  src={
                    user.avatar_url.startsWith('http')
                      ? user.avatar_url
                      : `http://localhost:8000${user.avatar_url}`
                  }
                  alt={user?.name || 'User'}
                  className="w-8 h-8 rounded-xl object-cover shadow-xs border border-[#35A66F]/40 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#087F8C] to-[#35A66F] flex items-center justify-center text-white font-bold text-xs uppercase shadow-xs shrink-0">
                  {user?.name?.charAt(0) || 'U'}
                </div>
              )}
              <span className="hidden sm:inline text-xs font-bold text-[#17324D] dark:text-white max-w-[100px] truncate">
                {user?.name?.split(' ')[0] || 'User'}
              </span>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#0F273D] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-2 z-50 text-xs space-y-1">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700/60">
                  <p className="font-bold text-[#17324D] dark:text-white truncate">{user?.name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                </div>
                <Link
                  to={
                    user?.role === 'PROVIDER'
                      ? '/provider/profile'
                      : user?.role === 'ADMIN'
                      ? '/admin/profile'
                      : '/customer/profile'
                  }
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-[#087F8C] dark:hover:text-[#27B7A8] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-[#35A66F]" />
                  <span>Profile Overview</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-left font-semibold cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
