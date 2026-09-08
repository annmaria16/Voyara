import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { customerApi } from '../../api/customer';
import { NotificationBell } from '../notifications/NotificationBell';
import {
  Search,
  Heart,
  Bell,
  Menu,
  Sun,
  Moon,
  LogOut,
  User,
  Settings,
  Sparkles,
} from 'lucide-react';

export const DashboardHeader = ({
  title = 'DASHBOARD',
  onMenuClick = () => {},
  placeholder = 'Search destinations, stays...',
}) => {
  const { user, logout } = useAuth();
  const { theme, setTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [liveResults, setLiveResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showLiveDropdown, setShowLiveDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const searchDropdownRef = useRef(null);
  const notificationsRef = useRef(null);
  const profileMenuRef = useRef(null);
  const debounceTimer = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target)) {
        setShowLiveDropdown(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setShowNotifications(false);
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
        const results = await customerApi.searchProperties({ destination: val.trim() });
        setLiveResults(Array.isArray(results) ? results.slice(0, 5) : []);
      } catch (err) {
        setLiveResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 150);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowLiveDropdown(false);
      navigate(`/search?destination=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSelectResult = (propId) => {
    setShowLiveDropdown(false);
    navigate(`/properties/${propId}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 bg-[#FFF8F0]/95 dark:bg-[#090F1D]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-8 py-3.5 select-none transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Mobile menu toggle & Page Title */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-[#F97360] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-sm sm:text-base font-black font-serif tracking-wider text-[#102A43] dark:text-white uppercase">
            {title}
          </h2>
        </div>

        {/* Right: Actions, Search, Theme Switcher, Notifications, Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Real-time Live Search Dock */}
          <div ref={searchDropdownRef} className="hidden md:block relative w-52 lg:w-72">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleQueryChange(e.target.value)}
                onFocus={() => searchQuery.trim() && setShowLiveDropdown(true)}
                placeholder={placeholder}
                className="w-full pl-8 pr-7 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-[#F97360] dark:focus:border-emerald-400 rounded-xl text-xs text-[#102A43] dark:text-white placeholder-slate-400 focus:outline-hidden transition-all shadow-2xs"
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
              <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-[#131D2E] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2 z-50 text-xs space-y-1 max-h-80 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2 py-1 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                  <span>Live Stays & Destinations</span>
                  {isSearching && <span className="text-emerald-500 font-semibold animate-pulse">Searching...</span>}
                </div>

                {liveResults.length === 0 && !isSearching ? (
                  <div className="p-3 text-center text-slate-500 dark:text-slate-400">
                    <p className="font-semibold text-xs text-slate-700 dark:text-slate-200">No matching stays found</p>
                    <p className="text-[11px] mt-0.5">Try searching Munnar, Goa, Manali, or Villa</p>
                  </div>
                ) : (
                  <>
                    {liveResults.map((stay) => {
                      const img = stay.images?.[0]?.image_url || stay.image_url || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=150&q=80';
                      const price = stay.rooms?.[0]?.base_price || stay.price || 4500;
                      return (
                        <div
                          key={stay.id}
                          onClick={() => handleSelectResult(stay.id)}
                          className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors group"
                        >
                          <img
                            src={img}
                            alt={stay.name}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-900 dark:text-white truncate group-hover:text-[#F97360] transition-colors">
                              {stay.name}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {stay.city || 'Munnar'}, {stay.state || 'Kerala'} • <span className="font-bold text-amber-500">★ {stay.rating || '4.8'}</span>
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-black text-xs text-[#F97360] font-serif">₹{price.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={handleSearch}
                      className="w-full text-center py-2 mt-1 rounded-xl bg-[#FFF8F0] dark:bg-slate-800 text-[#F97360] dark:text-orange-400 font-bold text-[11px] hover:bg-[#F97360] hover:text-white dark:hover:bg-[#F97360] dark:hover:text-white transition-all cursor-pointer"
                    >
                      View all results for "{searchQuery}" →
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Theme Switcher Toggle (1-click toggle / 2-way switcher) */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-[#F97360] hover:bg-white dark:hover:bg-slate-800 transition-colors border border-slate-200/80 dark:border-slate-800 cursor-pointer shadow-2xs"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <Moon className="w-4 h-4 text-emerald-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
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
                  src={user.avatar_url.startsWith('http') ? user.avatar_url : `http://localhost:8000${user.avatar_url}`}
                  alt={user?.name || 'User'}
                  className="w-8 h-8 rounded-xl object-cover shadow-xs border border-emerald-500/40 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#F97360] to-emerald-500 flex items-center justify-center text-white font-bold text-xs uppercase shadow-xs shrink-0">
                  {user?.name?.charAt(0) || 'U'}
                </div>
              )}
              <span className="hidden sm:inline text-xs font-bold text-[#102A43] dark:text-white max-w-[100px] truncate">
                {user?.name?.split(' ')[0] || 'User'}
              </span>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#131D2E] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-2 z-50 text-xs space-y-1">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700/60">
                  <p className="font-bold text-[#102A43] dark:text-white truncate">{user?.name}</p>
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
                  className="flex items-center space-x-2 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-[#F97360] dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-emerald-500" />
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
