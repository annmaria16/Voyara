import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { customerApi } from '../../api/customer';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import {
  Search,
  MapPin,
  Star,
  Heart,
  Calendar,
  ArrowRight,
  Sparkles,
  Home,
  Flame,
  BookOpen,
  ChevronRight,
  Compass,
} from 'lucide-react';

export const CustomerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recentBookings, setRecentBookings] = useState([]);
  const [recommendedStays, setRecommendedStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLocation, setSearchLocation] = useState('');
  const [liveHeroResults, setLiveHeroResults] = useState([]);
  const [showHeroDropdown, setShowHeroDropdown] = useState(false);
  const [isHeroSearching, setIsHeroSearching] = useState(false);
  const heroSearchRef = useRef(null);
  const heroDebounceRef = useRef(null);
  const [likedProperties, setLikedProperties] = useState({});

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (heroSearchRef.current && !heroSearchRef.current.contains(e.target)) {
        setShowHeroDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleHeroSearchChange = (val) => {
    setSearchLocation(val);
    if (!val.trim()) {
      setLiveHeroResults([]);
      setShowHeroDropdown(false);
      return;
    }

    setShowHeroDropdown(true);
    setIsHeroSearching(true);
    if (heroDebounceRef.current) clearTimeout(heroDebounceRef.current);

    heroDebounceRef.current = setTimeout(async () => {
      try {
        const results = await customerApi.searchProperties({ destination: val.trim() });
        setLiveHeroResults(Array.isArray(results) ? results.slice(0, 4) : []);
      } catch (err) {
        setLiveHeroResults([]);
      } finally {
        setIsHeroSearching(false);
      }
    }, 150);
  };

  const handleHeroSearch = (e) => {
    e.preventDefault();
    if (searchLocation.trim()) {
      setShowHeroDropdown(false);
      navigate(`/search?destination=${encodeURIComponent(searchLocation.trim())}`);
    } else {
      navigate('/search');
    }
  };

  const toggleLike = (id) => {
    setLikedProperties((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const quickActions = [
    {
      title: 'Explore Stays',
      description: 'Find luxury stays & villas',
      path: '/search',
      icon: Home,
      iconBg: 'bg-gradient-to-br from-teal-400 to-emerald-500 text-white shadow-md shadow-emerald-500/20',
      border: 'hover:border-emerald-400',
    },
    {
      title: 'Experiences',
      description: 'Things to do & guided tours',
      path: '/experiences',
      icon: Flame,
      iconBg: 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md shadow-green-500/20',
      border: 'hover:border-green-400',
    },
    {
      title: 'My Bookings',
      description: 'View & manage your trips',
      path: '/customer/bookings',
      icon: BookOpen,
      iconBg: 'bg-gradient-to-br from-[#F97360] to-orange-500 text-white shadow-md shadow-orange-500/20',
      border: 'hover:border-[#F97360]',
    },
    {
      title: 'Favorites',
      description: 'Saved dream destinations',
      path: '/search',
      icon: Heart,
      iconBg: 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-md shadow-purple-500/20',
      border: 'hover:border-purple-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Travel Hero Section */}
      <div className="relative rounded-3xl overflow-hidden shadow-lg border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-white via-[#F0FDF8] to-[#E6F7F2] dark:from-[#0B1528] dark:via-[#0F1D38] dark:to-[#081020] p-6 sm:p-8 md:p-10 transition-colors duration-200">
        {/* Subtle Decorative Tropical/Wave Graphic Accent on right for Light Mode */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 dark:opacity-5 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500 via-teal-400 to-transparent"></div>

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/15 dark:bg-emerald-500/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-300" />
            <span>Discover Handpicked Stays</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-serif text-[#102A43] dark:text-white tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] || 'Ananya'}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
            Where will your next adventure take you?
          </p>

          {/* Embedded Real-Time Search Dock with Floating Live Results */}
          <div ref={heroSearchRef} className="relative w-full max-w-lg mt-3">
            <form
              onSubmit={handleHeroSearch}
              className="flex items-center bg-white dark:bg-[#131D2E] border border-slate-200 dark:border-slate-700 rounded-2xl p-1.5 shadow-md transition-all focus-within:border-[#F97360]"
            >
              <div className="flex-1 flex items-center pl-3 space-x-2">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchLocation}
                  onChange={(e) => handleHeroSearchChange(e.target.value)}
                  onFocus={() => searchLocation.trim() && setShowHeroDropdown(true)}
                  placeholder="Search destinations, stays, or experiences..."
                  className="w-full bg-transparent text-xs text-[#102A43] dark:text-white placeholder-slate-400 focus:outline-hidden font-medium"
                />
                {searchLocation && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchLocation('');
                      setLiveHeroResults([]);
                      setShowHeroDropdown(false);
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs pr-2 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-[#e05e4b] hover:to-orange-600 text-white text-xs font-bold rounded-xl shadow-md shadow-[#F97360]/30 transition-all cursor-pointer shrink-0"
              >
                Search
              </button>
            </form>

            {/* Live Autocomplete Results Floating Dropdown */}
            {showHeroDropdown && searchLocation.trim() && (
              <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-[#131D2E] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2 z-50 text-xs space-y-1 max-h-80 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2 py-1 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                  <span>Live Stays Matching "{searchLocation}"</span>
                  {isHeroSearching && <span className="text-emerald-500 font-semibold animate-pulse">Searching...</span>}
                </div>

                {liveHeroResults.length === 0 && !isHeroSearching ? (
                  <div className="p-3 text-center text-slate-500 dark:text-slate-400">
                    <p className="font-semibold text-xs text-slate-700 dark:text-slate-200">No matching stays found</p>
                    <p className="text-[11px] mt-0.5">Try searching Munnar, Goa, Manali, or Villa</p>
                  </div>
                ) : (
                  <>
                    {liveHeroResults.map((stay) => {
                      const img = stay.images?.[0]?.image_url || stay.image_url || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=150&q=80';
                      const price = stay.rooms?.[0]?.base_price || stay.price || 4500;
                      return (
                        <div
                          key={stay.id}
                          onClick={() => {
                            setShowHeroDropdown(false);
                            navigate(`/properties/${stay.id}`);
                          }}
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
                      onClick={handleHeroSearch}
                      className="w-full text-center py-2 mt-1 rounded-xl bg-[#FFF8F0] dark:bg-slate-800 text-[#F97360] dark:text-orange-400 font-bold text-[11px] hover:bg-[#F97360] hover:text-white dark:hover:bg-[#F97360] dark:hover:text-white transition-all cursor-pointer"
                    >
                      View all results for "{searchLocation}" →
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Quick Action Cards (4 horizontal cards with vibrant distinct gradient icons matching reference) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.title}
              to={action.path}
              className={`p-4 bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs hover:shadow-md transition-all flex items-center space-x-3.5 group hover:-translate-y-1 ${action.border}`}
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${action.iconBg}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-[#102A43] dark:text-white font-sans group-hover:text-[#F97360] transition-colors">
                  {action.title}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                  {action.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 3. Bottom Grid: Upcoming Trips (Left) + Recommended for You (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Upcoming Trips */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold font-serif text-[#102A43] dark:text-white">
              Upcoming Trips
            </h2>
            <Link
              to="/customer/bookings"
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-0.5"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-8 bg-white dark:bg-[#131D2E] rounded-2xl border border-slate-200/80 dark:border-slate-800 flex justify-center">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : recentBookings.length === 0 ? (
            <div className="bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#102A43] dark:text-white">
                  Your next adventure is waiting.
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Find handpicked stays verified by VeriNova across Goa, Kerala, and Manali.
                </p>
              </div>
              <Link
                to="/search"
                className="inline-block px-4 py-2 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-[#e05e4b] hover:to-orange-600 text-white text-xs font-bold rounded-xl shadow-md shadow-[#F97360]/20 transition-all cursor-pointer"
              >
                Explore Stays
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentBookings.slice(0, 2).map((b) => (
                <div
                  key={b.id}
                  className="bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3 group"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={
                        b.property?.images?.[0]?.image_url ||
                        'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80'
                      }
                      alt="Stay"
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[#102A43] dark:text-white truncate">
                          {b.property?.name || 'Luxury Stay'}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {b.check_in} — {b.check_out}
                      </p>
                      <p className="text-xs font-bold text-[#F97360] font-serif mt-1">
                        ₹{b.total_amount?.toLocaleString('en-IN')}{' '}
                        <span className="text-[10px] text-slate-400 font-sans font-normal">
                          ({b.total_nights || 1} Night)
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <StatusBadge status={b.status || 'CONFIRMED'} size="sm" />
                    <Link
                      to="/customer/bookings"
                      className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      View Booking
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (7 cols): Recommended for You */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold font-serif text-[#102A43] dark:text-white">
              Recommended for You
            </h2>
            <Link
              to="/search"
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-0.5"
            >
              <span>View All Stays</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(recommendedStays.length > 0
              ? recommendedStays.slice(0, 2)
              : [
                  {
                    id: 1,
                    name: 'Mountain Mist Retreat',
                    city: 'Munnar',
                    state: 'Kerala',
                    rating: 4.8,
                    price: 4200,
                    image_url:
                      'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=600&q=80',
                  },
                  {
                    id: 2,
                    name: 'Whispering Palms Villa',
                    city: 'Goa',
                    state: 'India',
                    rating: 4.9,
                    price: 8500,
                    image_url:
                      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80',
                  },
                ]
            ).map((stay) => {
              const stayId = stay.id;
              const isLiked = !!likedProperties[stayId];
              const price =
                stay.rooms?.[0]?.base_price ||
                stay.rooms?.[0]?.price_per_night ||
                stay.price ||
                4500;
              const img =
                stay.images?.[0]?.image_url ||
                stay.image_url ||
                'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80';

              return (
                <div
                  key={stayId}
                  className="bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all group"
                >
                  <div className="relative aspect-16/10 overflow-hidden">
                    <img
                      src={img}
                      alt={stay.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <button
                      onClick={() => toggleLike(stayId)}
                      className={`absolute top-2.5 right-2.5 p-2 rounded-xl backdrop-blur-md transition-colors cursor-pointer ${
                        isLiked
                          ? 'bg-[#F97360] text-white'
                          : 'bg-black/40 text-white hover:text-[#F97360]'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-white' : ''}`} />
                    </button>
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-[#102A43] dark:text-white font-sans line-clamp-1">
                          {stay.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-emerald-500" />
                          <span>
                            {stay.city || 'Munnar'}, {stay.state || 'India'}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center text-xs font-bold text-amber-500 shrink-0">
                        <Star className="w-3 h-3 fill-amber-500 mr-0.5" />
                        <span>{stay.rating || '4.8'}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <p className="text-xs sm:text-sm font-black text-[#102A43] dark:text-white font-serif">
                        ₹{price.toLocaleString('en-IN')}{' '}
                        <span className="text-[10px] text-slate-400 font-sans font-normal">
                          / night
                        </span>
                      </p>
                      <Link
                        to={`/properties/${stayId}`}
                        className="px-3 py-1.5 bg-[#F97360]/15 hover:bg-[#F97360] text-[#F97360] hover:text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Book Stay
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
