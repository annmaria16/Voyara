import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { customerApi } from '../../api/customer';
import { VerificationBadge } from '../../components/verification/VerificationBadge';
import { getBookingStatusTheme } from '../../utils/bookingStatusTheme';
import { resolveImageUrl } from '../../utils/imageUrl';
import {
  Search,
  MapPin,
  Star,
  ShieldCheck,
  Calendar,
  ArrowRight,
  Sparkles,
  Home,
  Flame,
  BookOpen,
  Compass,
  CheckCircle2,
  TreePine,
  Waves,
  Mountain,
  Castle,
  Lock,
  Zap,
  HelpCircle,
  ChevronRight,
  Mail,
  MessageSquare,
  Users,
} from 'lucide-react';

export const CustomerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchLocation, setSearchLocation] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [liveHeroResults, setLiveHeroResults] = useState([]);
  const [showHeroDropdown, setShowHeroDropdown] = useState(false);
  const [isHeroSearching, setIsHeroSearching] = useState(false);
  const [upcomingBooking, setUpcomingBooking] = useState(null);
  const [featuredStays, setFeaturedStays] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const heroSearchRef = useRef(null);
  const heroDebounceRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bookings, stays] = await Promise.all([
          customerApi.getMyBookings().catch(() => []),
          customerApi.searchProperties({}).catch(() => []),
        ]);

        if (Array.isArray(bookings) && bookings.length > 0) {
          const upcoming =
            bookings.find((b) => b.status === 'CONFIRMED' || b.status === 'PENDING') ||
            bookings[0];
          setUpcomingBooking(upcoming);
        }

        if (Array.isArray(stays) && stays.length > 0) {
          setFeaturedStays(stays.slice(0, 4));
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoadingBookings(false);
        setLoadingFeatured(false);
      }
    };
    fetchData();
  }, []);

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
    const params = new URLSearchParams();
    if (searchLocation.trim()) params.append('destination', searchLocation.trim());
    if (checkIn) params.append('check_in', checkIn);
    if (checkOut) params.append('check_out', checkOut);
    if (guests) params.append('guests', guests);

    setShowHeroDropdown(false);
    navigate(`/search?${params.toString()}`);
  };

  const quickActions = [
    {
      title: 'Explore Sanctuaries',
      description: 'Handpicked stays & heritage villas',
      path: '/search',
      icon: Home,
      iconBg: 'bg-[#087F8C] text-white shadow-md shadow-[#087F8C]/20',
      border: 'hover:border-[#087F8C]',
    },
    {
      title: 'Curated Experiences',
      description: 'Stay Partner-led treks & cultural journeys',
      path: '/experiences',
      icon: Flame,
      iconBg: 'bg-[#F97316] text-white shadow-md shadow-[#F97316]/20',
      border: 'hover:border-[#F97316]',
    },
    {
      title: 'My Journeys',
      description: 'Digital boarding passes & itinerary',
      path: '/customer/bookings',
      icon: BookOpen,
      iconBg: 'bg-[#35A66F] text-white shadow-md shadow-[#35A66F]/20',
      border: 'hover:border-[#35A66F]',
    },
    {
      title: 'Travel Concierge',
      description: '24/7 VeriNova assistance desk',
      path: '/customer/support',
      icon: HelpCircle,
      iconBg: 'bg-[#17324D] text-white shadow-md shadow-[#17324D]/20',
      border: 'hover:border-[#17324D]',
    },
  ];

  const travelCollections = [
    {
      title: 'Heritage Homestays',
      tagline: 'Centuries-old ancestral estates & spice plantations',
      destination: 'Munnar',
      badge: 'Heritage',
      icon: Castle,
      bgGradient: 'from-[#17324D]/90 via-[#087F8C]/70 to-transparent',
      img: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Coastal & Sunset Villas',
      tagline: 'Goa, Gokarna, Varkala • Ocean breeze infinity pools',
      destination: 'Goa',
      badge: 'Beachfront',
      icon: Waves,
      bgGradient: 'from-[#087F8C]/90 via-[#0F9D9A]/70 to-transparent',
      img: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Western Ghats Tea Chalets',
      tagline: 'Munnar, Manali, Ooty • Misty hills & cozy fireplaces',
      destination: 'Munnar',
      badge: 'High Altitude',
      icon: Mountain,
      bgGradient: 'from-[#35A66F]/90 via-[#087F8C]/70 to-transparent',
      img: 'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Rainforest Eco Retreats',
      tagline: 'Wayanad, Coorg, Thekkady • Canopy immersion & waterfalls',
      destination: 'Wayanad',
      badge: 'Eco Sanctuary',
      icon: TreePine,
      bgGradient: 'from-[#17324D]/90 via-[#35A66F]/70 to-transparent',
      img: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
    },
  ];

  const popularDestinations = [
    {
      name: 'Munnar',
      state: 'Kerala',
      type: 'Hill Sanctuary',
      img: 'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Goa',
      state: 'West Coast',
      type: 'Sunset Coast',
      img: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Wayanad',
      state: 'Kerala',
      type: 'Rainforest Valley',
      img: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Manali',
      state: 'Himachal',
      type: 'Alpine Crest',
      img: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Jaipur',
      state: 'Rajasthan',
      type: 'Royal Heritage',
      img: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Udaipur',
      state: 'Rajasthan',
      type: 'Lake Palace',
      img: 'https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?auto=format&fit=crop&w=600&q=80',
    },
  ];

  return (
    <div className="space-y-10">
      {/* 1. Cinematic Hero Journal Banner */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/20 dark:border-teal-900/40 bg-[#091B29]">
        {/* Full Cinematic Photography with Warm Editorial Lighting */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2000&q=85"
            alt="Voyara Sanctuary"
            className="w-full h-full object-cover object-center filter brightness-[0.82] scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#091B29]/95 via-[#087F8C]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#091B29] via-transparent to-transparent" />
        </div>

        <div className="relative z-10 p-6 sm:p-10 lg:p-14 space-y-8">
          <div className="space-y-4 max-w-3xl">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif text-white tracking-tight leading-tight">
              Where will you find yourself next?
            </h1>

            <p className="text-sm sm:text-base text-slate-200 font-light leading-relaxed max-w-xl">
              Welcome back, <strong className="text-white font-medium">{user?.name?.split(' ')[0] || 'Traveler'}</strong>. Discover breathtaking private retreats, verified homestays, and immersive host experiences across India.
            </p>
          </div>

          {/* Frosted Glass 3-Part Search Controls */}
          <form
            onSubmit={handleHeroSearch}
            className="backdrop-blur-2xl bg-white/95 dark:bg-[#0F273D]/95 p-3 sm:p-4 rounded-3xl sm:rounded-full shadow-2xl border border-white/60 dark:border-teal-900/40 flex flex-col lg:flex-row items-stretch lg:items-center gap-3 text-slate-800 dark:text-white max-w-4xl"
          >
            {/* Destination */}
            <div
              ref={heroSearchRef}
              className="relative flex-1 flex items-center px-4 py-2 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-700"
            >
              <MapPin className="w-5 h-5 text-[#F97316] shrink-0 mr-3" />
              <div className="w-full">
                <label className="block text-[9px] font-bold uppercase tracking-wider text-[#607080] dark:text-slate-400">
                  Destination
                </label>
                <input
                  type="text"
                  value={searchLocation}
                  onChange={(e) => handleHeroSearchChange(e.target.value)}
                  onFocus={() => searchLocation.trim() && setShowHeroDropdown(true)}
                  placeholder="Where to? (e.g. Munnar, Goa, Jaipur)"
                  className="w-full bg-transparent text-xs font-semibold focus:outline-hidden placeholder:text-slate-400 text-[#17324D] dark:text-white"
                />
              </div>

              {/* Autocomplete Dropdown */}
              {showHeroDropdown && searchLocation.trim() && (
                <div className="absolute left-0 right-0 top-full mt-3 bg-white dark:bg-[#0F273D] border border-slate-200 dark:border-teal-900/40 rounded-2xl shadow-2xl p-2 z-50 text-xs space-y-1 max-h-80 overflow-y-auto custom-scrollbar">
                  <div className="px-3 py-1 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                    <span>Live Sanctuaries</span>
                    {isHeroSearching && (
                      <span className="text-[#F97316] font-semibold animate-pulse">Searching...</span>
                    )}
                  </div>
                  {liveHeroResults.length === 0 && !isHeroSearching ? (
                    <div className="p-4 text-center text-slate-500 text-xs">No matching stays found</div>
                  ) : (
                    liveHeroResults.map((stay) => (
                      <div
                        key={stay.id}
                        onClick={() => {
                          setShowHeroDropdown(false);
                          navigate(`/properties/${stay.id}`);
                        }}
                        className="flex items-center space-x-3 p-2.5 rounded-xl hover:bg-[#FFFDF7] dark:hover:bg-[#091B29] cursor-pointer transition-colors"
                      >
                        <img
                          src={
                            stay.images?.[0]?.image_url ||
                            stay.image_url ||
                            'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=150&q=80'
                          }
                          alt={stay.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 dark:text-white truncate">{stay.name}</p>
                          <p className="text-[10px] text-slate-500">
                            {stay.city}, {stay.state}
                          </p>
                        </div>
                        <span className="font-serif font-bold text-xs text-[#F97316]">
                          ₹{(stay.rooms?.[0]?.base_price || 4500).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Check-In / Check-Out Dates */}
            <div className="flex-1 flex items-center px-4 py-2 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-700">
              <Calendar className="w-5 h-5 text-[#087F8C] shrink-0 mr-3" />
              <div className="grid grid-cols-2 gap-3 w-full">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-[#607080] dark:text-slate-400">
                    Check In
                  </label>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold focus:outline-hidden cursor-pointer text-[#17324D] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-[#607080] dark:text-slate-400">
                    Check Out
                  </label>
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold focus:outline-hidden cursor-pointer text-[#17324D] dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Guests */}
            <div className="flex items-center px-4 py-2 min-w-[130px]">
              <Users className="w-5 h-5 text-[#F97316] shrink-0 mr-3" />
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-[#607080] dark:text-slate-400">
                  Guests
                </label>
                <select
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="bg-transparent text-xs font-semibold focus:outline-hidden cursor-pointer text-[#17324D] dark:text-white"
                >
                  <option value={1} className="dark:bg-[#0F273D]">1 Guest</option>
                  <option value={2} className="dark:bg-[#0F273D]">2 Guests</option>
                  <option value={3} className="dark:bg-[#0F273D]">3 Guests</option>
                  <option value={4} className="dark:bg-[#0F273D]">4+ Guests</option>
                </select>
              </div>
            </div>

            {/* Search CTA */}
            <button
              type="submit"
              className="px-8 py-3.5 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-bold text-xs rounded-2xl sm:rounded-full shadow-lg shadow-[#F97316]/20 hover:scale-[1.02] transition-all shrink-0 cursor-pointer flex items-center justify-center space-x-2"
            >
              <Search className="w-4 h-4" />
              <span>Discover Stays</span>
            </button>
          </form>
        </div>
      </div>

      {/* Trip Planner Feature Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#087F8C]/15 via-[#0F9D9A]/10 to-[#F97316]/15 border border-[#087F8C]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#087F8C] to-[#0F9D9A] text-white flex items-center justify-center shrink-0 shadow-md">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#087F8C]/20 text-[#087F8C] dark:text-teal-300 uppercase tracking-wider font-mono">
                Custom Itineraries
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-serif font-bold text-slate-900 dark:text-white">
              Plan Your Next Getaway
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-light max-w-xl">
              Build a personalized itinerary around your dates, travel style, favorite experiences, and regional highlights.
            </p>
          </div>
        </div>
        <Link
          to="/traveler/trip-planner"
          className="px-5 py-2.5 bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] hover:from-[#076a75] hover:to-[#0c827f] text-white font-bold text-xs rounded-xl shadow-md shadow-teal-900/20 shrink-0 flex items-center space-x-2 transition-all self-start sm:self-center"
        >
          <span>Plan My Trip</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 2. Upcoming Journey Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#17324D] dark:text-white">
              Upcoming Journey
            </h2>
            <p className="text-xs text-[#607080] dark:text-slate-400">
              Your next verified sanctuary stay and digital itinerary
            </p>
          </div>
          <Link
            to="/customer/bookings"
            className="text-xs font-bold text-[#F97316] hover:underline flex items-center space-x-1"
          >
            <span>My Journeys</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loadingBookings ? (
          <div className="h-48 rounded-3xl skeleton" />
        ) : upcomingBooking ? (() => {
          const theme = getBookingStatusTheme(upcomingBooking.status);
          const StatusIcon = theme.icon;
          return (
            <div className={`rounded-3xl p-6 sm:p-8 border ${theme.cardBorder} ${theme.cardBg} ${theme.glowClass} shadow-sm hover:shadow-md transition-all grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative overflow-hidden`}>
              {/* Top Accent Gradient Bar */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${theme.cardAccentBar}`} />

              <div className="md:col-span-4 h-52 rounded-2xl overflow-hidden relative shadow-md">
                <img
                  src={
                    resolveImageUrl(
                      upcomingBooking.property?.images?.[0]?.image_url ||
                      (typeof upcomingBooking.property?.images?.[0] === 'string' ? upcomingBooking.property.images[0] : null) ||
                      upcomingBooking.property?.cover_image ||
                      upcomingBooking.property_image
                    ) ||
                    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'
                  }
                  alt={upcomingBooking.property?.name || upcomingBooking.property_name || 'Booked Stay'}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80';
                  }}
                  className="w-full h-full object-cover"
                />
                <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-xs flex items-center space-x-1 border ${theme.badgeClasses}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${theme.dotClass}`} />
                  <span>{theme.label}</span>
                </span>
              </div>

              <div className="md:col-span-8 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border ${theme.verinovaPillClasses}`}>
                      VOY-{upcomingBooking.id} • {upcomingBooking.verinova_verification_id || 'VN-TX-VERIFIED'}
                    </span>
                    <h3 className="text-2xl font-serif font-bold text-[#17324D] dark:text-white mt-2">
                      {upcomingBooking.property?.name || upcomingBooking.property_name || 'Sanctuary Stay'}
                    </h3>
                    <p className="text-xs text-[#607080] dark:text-slate-300 flex items-center space-x-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-[#F97316]" />
                      <span>{upcomingBooking.property?.city ? `${upcomingBooking.property.city}, ${upcomingBooking.property.state || ''}` : 'Verified Sanctuary'}</span>
                    </p>
                  </div>
                  <VerificationBadge
                    status={
                      upcomingBooking.verinova_status ||
                      (upcomingBooking.status === 'FAILED' ? 'FAILED' : upcomingBooking.status === 'CANCELLED' ? 'NEEDS_REVIEW' : 'VERIFIED')
                    }
                    size="sm"
                  />
                </div>

                {/* 4 Detail Columns - with matching state color */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className={`p-3 rounded-xl border ${theme.columnBg} ${theme.columnBorder} transition-all`}>
                    <span className={`block text-[10px] font-bold uppercase ${theme.columnHeaderClass}`}>Check In</span>
                    <span className={`font-bold text-xs mt-0.5 block ${theme.columnValueClass}`}>{upcomingBooking.check_in}</span>
                  </div>
                  <div className={`p-3 rounded-xl border ${theme.columnBg} ${theme.columnBorder} transition-all`}>
                    <span className={`block text-[10px] font-bold uppercase ${theme.columnHeaderClass}`}>Check Out</span>
                    <span className={`font-bold text-xs mt-0.5 block ${theme.columnValueClass}`}>{upcomingBooking.check_out}</span>
                  </div>
                  <div className={`p-3 rounded-xl border ${theme.columnBg} ${theme.columnBorder} transition-all`}>
                    <span className={`block text-[10px] font-bold uppercase ${theme.columnHeaderClass}`}>Guests</span>
                    <span className={`font-bold text-xs mt-0.5 block ${theme.columnValueClass}`}>{upcomingBooking.guests_count || 2} Guests</span>
                  </div>
                  <div className={`p-3 rounded-xl border ${theme.columnBg} ${theme.columnBorder} transition-all`}>
                    <span className={`block text-[10px] font-bold uppercase ${theme.columnHeaderClass}`}>Total Paid</span>
                    <span className={`font-serif font-black text-sm mt-0.5 block ${theme.priceClass}`}>
                      ₹{Number(upcomingBooking.total_price || upcomingBooking.total_amount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="pt-1 flex items-center space-x-3">
                  <Link
                    to="/customer/bookings"
                    className="px-5 py-2.5 bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white text-xs font-bold rounded-2xl shadow-md shadow-[#F97316]/20 hover:scale-[1.02] transition-all"
                  >
                    View Digital Itinerary
                  </Link>
                  {upcomingBooking.property_id && (
                    <Link
                      to={`/properties/${upcomingBooking.property_id}`}
                      className="px-5 py-2.5 bg-white dark:bg-[#0F273D] border border-slate-200 dark:border-teal-900/40 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-2xl hover:bg-slate-50 dark:hover:bg-[#091B29] transition-all"
                    >
                      Sanctuary Details
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })() : (
          /* Empty Travel State with Magazine Photo CTA */
          <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-8 sm:p-12 border border-slate-100 dark:border-teal-900/40 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-5 h-48 sm:h-56 rounded-2xl overflow-hidden relative shadow-md">
              <img
                src="https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=800&q=80"
                alt="Plan Stay"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#F6C945]">Curated Destination</span>
                <p className="text-sm font-serif font-bold">Munnar Misty Tea Estates</p>
              </div>
            </div>

            <div className="md:col-span-7 space-y-3">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/40 text-[#F97316] text-xs font-bold border border-orange-200/60 dark:border-orange-800/40">
                <Compass className="w-3.5 h-3.5" />
                <span>Ready for an escape?</span>
              </div>
              <h3 className="text-2xl font-serif font-bold text-[#17324D] dark:text-white">
                Your next journey hasn't been planned yet.
              </h3>
              <p className="text-xs text-[#607080] dark:text-slate-400 font-light leading-relaxed">
                Discover misty tea bungalows, coastal pool villas, and authentic local culinary experiences across India with VeriNova instant verification.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/search')}
                  className="px-6 py-3 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-bold text-xs rounded-2xl shadow-lg shadow-[#F97316]/20 hover:scale-[1.02] transition-all cursor-pointer inline-flex items-center space-x-2"
                >
                  <span>Discover a Sanctuary</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Quick Action Gateways */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.title}
              to={action.path}
              className={`p-5 bg-white dark:bg-[#0F273D] border border-slate-100 dark:border-teal-900/40 rounded-3xl shadow-sm hover:shadow-xl transition-all flex items-center space-x-4 group hover:-translate-y-1 ${action.border}`}
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${action.iconBg}`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-serif font-bold text-[#17324D] dark:text-white group-hover:text-[#087F8C] transition-colors">
                  {action.title}
                </h3>
                <p className="text-xs text-[#607080] dark:text-slate-400 truncate mt-0.5 font-light">
                  {action.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 4. Curated Escapes For You (Live DB Stays Showcase) */}
      {featuredStays.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#17324D] dark:text-white">
                Featured Sanctuaries
              </h2>
              <p className="text-xs text-[#607080] dark:text-slate-400">
                Handpicked boutique retreats with VeriNova verified hosts
              </p>
            </div>
            <Link
              to="/search"
              className="text-xs font-bold text-[#F97316] hover:underline flex items-center space-x-1"
            >
              <span>View All Stays</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featuredStays.map((stay) => {
              const img =
                stay.images?.[0]?.image_url ||
                stay.image_url ||
                'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80';
              const price = stay.rooms?.[0]?.base_price || 4500;

              return (
                <Link
                  key={stay.id}
                  to={`/properties/${stay.id}`}
                  className="group bg-white dark:bg-[#0F273D] border border-slate-100 dark:border-teal-900/40 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col hover:-translate-y-1.5"
                >
                  <div className="aspect-16/10 relative overflow-hidden bg-slate-100 dark:bg-slate-900">
                    <img
                      src={img}
                      alt={stay.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3.5 left-3.5">
                      <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold">
                        <Star className="w-3 h-3 text-[#F6C945] fill-current" />
                        <span>4.96</span>
                      </span>
                    </div>
                    <div className="absolute top-3.5 right-3.5">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-[#35A66F] text-white text-[9px] font-bold tracking-wider uppercase">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h4 className="text-base font-serif font-bold text-[#17324D] dark:text-white truncate group-hover:text-[#087F8C] transition-colors">
                        {stay.name}
                      </h4>
                      <p className="text-xs text-[#607080] dark:text-slate-400 truncate flex items-center space-x-1.5 mt-1 font-light">
                        <MapPin className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
                        <span>{stay.city || 'Munnar'}, {stay.state || 'Kerala'}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Starting from</span>
                        <span className="font-serif font-black text-sm text-[#F97316]">
                          ₹{price.toLocaleString('en-IN')} <span className="text-[10px] font-sans font-normal text-slate-400">/ night</span>
                        </span>
                      </div>
                      <span className="px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-[#F97316] text-xs font-bold group-hover:bg-[#F97316] group-hover:text-white transition-colors">
                        Explore
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Trending Destination Gateways */}
      <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-teal-900/40 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#17324D] dark:text-white">
              Trending Destination Gateways
            </h2>
            <p className="text-xs text-[#607080] dark:text-slate-400">
              Browse handpicked regions with verified local sanctuaries
            </p>
          </div>
          <Link
            to="/search"
            className="text-xs font-bold text-[#F97316] hover:underline flex items-center space-x-1"
          >
            <span>Explore All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {popularDestinations.map((dest) => (
            <div
              key={dest.name}
              onClick={() => navigate(`/search?destination=${encodeURIComponent(dest.name)}`)}
              className="group relative rounded-2xl overflow-hidden aspect-4/5 cursor-pointer shadow-md border border-slate-100 dark:border-slate-800 transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <img
                src={dest.img}
                alt={dest.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
              <div className="absolute bottom-3.5 left-3.5 right-3.5 text-white">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#F6C945] block">
                  {dest.type}
                </span>
                <h4 className="text-base font-serif font-bold leading-tight mt-0.5">
                  {dest.name}
                </h4>
                <p className="text-[11px] text-slate-300 font-light">{dest.state}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Curated Stay Collections ("Escape by Setting") */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#17324D] dark:text-white">
              Curated Sanctuary Collections
            </h2>
            <p className="text-xs text-[#607080] dark:text-slate-400">
              Handpicked retreats tailored to your preferred landscape and architecture
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {travelCollections.map((col) => {
            const Icon = col.icon;
            return (
              <div
                key={col.title}
                onClick={() => navigate(`/search?destination=${encodeURIComponent(col.destination)}`)}
                className="group relative rounded-3xl overflow-hidden aspect-4/3 sm:aspect-16/11 cursor-pointer border border-slate-100 dark:border-slate-800 shadow-lg transition-transform hover:-translate-y-1.5"
              >
                <img
                  src={col.img}
                  alt={col.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${col.bgGradient} opacity-90 group-hover:opacity-95 transition-opacity`} />

                <div className="absolute inset-0 p-6 flex flex-col justify-between text-white">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/20 backdrop-blur-md">
                      {col.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-serif font-bold leading-snug">
                      {col.title}
                    </h3>
                    <p className="text-xs text-slate-200 mt-1 line-clamp-1 font-light">
                      {col.tagline}
                    </p>
                    <div className="flex items-center space-x-1 text-xs font-bold text-[#F6C945] mt-2.5 group-hover:translate-x-1 transition-transform">
                      <span>Explore Collection</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 7. VeriNova Trust & Smart Stay Guarantees */}
      <div className="rounded-3xl p-6 sm:p-10 bg-gradient-to-br from-[#17324D] via-[#087F8C]/90 to-[#091B29] text-white space-y-6 shadow-2xl border border-teal-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#27B7A8]/10 rounded-full filter blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-[#27B7A8]" />
              <span>VeriNova™ Transactional Integrity Framework</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
              Built on Zero-Risk Smart Stay Guarantees
            </h2>
          </div>
          <Link
            to="/customer/support"
            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold transition-all border border-white/20"
          >
            How We Protect Stays
          </Link>
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center text-[#27B7A8]">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-serif font-bold text-white">Row-Level Double Booking Safety</h4>
            <p className="text-slate-300 leading-relaxed font-light">
              Real-time concurrency locks protect every room transaction so simultaneous bookings never conflict.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-[#F97316]">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-serif font-bold text-white">Authoritative Transparent Pricing</h4>
            <p className="text-slate-300 leading-relaxed font-light">
              Nightly rates, experiences, and tax calculations are validated strictly by backend algorithms with zero hidden surge fees.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#35A66F]/20 flex items-center justify-center text-[#35A66F]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-serif font-bold text-white">100% Verified Sanctuaries</h4>
            <p className="text-slate-300 leading-relaxed font-light">
              Every sanctuary undergoes thorough physical, postal, and operational review before accepting guests.
            </p>
          </div>
        </div>
      </div>

      {/* 8. Concierge Help & Support Callout */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0F273D] border border-slate-100 dark:border-teal-900/40 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-[#F97316] flex items-center justify-center shrink-0">
            <Mail className="w-7 h-7" />
          </div>
          <div className="min-w-0 space-y-1">
            <h3 className="text-base font-serif font-bold text-[#17324D] dark:text-white">
              Need assistance with your booking or itinerary?
            </h3>
            <p className="text-xs text-[#607080] dark:text-slate-400">
              Direct Travel Concierge: <strong className="text-[#F97316]">adminvoyara@gmail.com</strong> • 24/7 Verified Support
            </p>
          </div>
        </div>

        <Link
          to="/customer/support"
          className="px-6 py-3 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white text-xs font-bold rounded-2xl shadow-lg shadow-[#F97316]/20 hover:scale-[1.02] transition-all shrink-0 cursor-pointer flex items-center space-x-2"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Open Concierge Desk</span>
        </Link>
      </div>
    </div>
  );
};

export default CustomerDashboard;
