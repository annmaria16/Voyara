import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { customerApi } from '../../api/customer';
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
  Luggage,
  Coffee,
  Sun,
  ChevronRight,
  Heart,
  Eye,
  Award,
  Palmtree,
  Tent,
  Sunset,
  Mail,
  MessageSquare
} from 'lucide-react';


export const CustomerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchLocation, setSearchLocation] = useState('');
  const [liveHeroResults, setLiveHeroResults] = useState([]);
  const [showHeroDropdown, setShowHeroDropdown] = useState(false);
  const [isHeroSearching, setIsHeroSearching] = useState(false);
  const heroSearchRef = useRef(null);
  const heroDebounceRef = useRef(null);

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

  const quickActions = [
    {
      title: 'Explore Sanctuaries',
      description: 'Discover luxury stays & villas',
      path: '/search',
      icon: Home,
      iconBg: 'bg-gradient-to-br from-teal-400 to-emerald-500 text-white shadow-md shadow-emerald-500/20',
      border: 'hover:border-emerald-400',
    },
    {
      title: 'Host Experiences',
      description: 'Curated adventures & workshops',
      path: '/experiences',
      icon: Flame,
      iconBg: 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md shadow-green-500/20',
      border: 'hover:border-green-400',
    },
    {
      title: 'My Bookings',
      description: 'Review confirmed reservations',
      path: '/customer/bookings',
      icon: BookOpen,
      iconBg: 'bg-gradient-to-br from-[#F97360] to-orange-500 text-white shadow-md shadow-orange-500/20',
      border: 'hover:border-[#F97360]',
    },
    {
      title: 'Travel Support',
      description: '24/7 VeriNova concierge desk',
      path: '/support',
      icon: HelpCircle,
      iconBg: 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/20',
      border: 'hover:border-purple-400',
    },
  ];

  const travelCollections = [
    {
      title: 'Mountain & Cliffside Sanctuaries',
      tagline: 'Munnar, Manali, Ooty • Mist-covered valleys',
      destination: 'Munnar',
      badge: 'High Altitude',
      icon: Mountain,
      bgGradient: 'from-emerald-950/90 to-teal-950/70',
      img: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Coastal & Sunset Private Villas',
      tagline: 'Goa, Gokarna, Varkala • Ocean breeze stays',
      destination: 'Goa',
      badge: 'Beachfront',
      icon: Waves,
      bgGradient: 'from-orange-950/90 to-amber-950/70',
      img: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Rainforest & Eco Treehouse Escapes',
      tagline: 'Wayanad, Coorg, Thekkady • Canopy living',
      destination: 'Wayanad',
      badge: 'Eco Living',
      icon: TreePine,
      bgGradient: 'from-green-950/90 to-emerald-950/70',
      img: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Heritage Palaces & Boutique Estates',
      tagline: 'Jaipur, Udaipur, Kochi • Timeless elegance',
      destination: 'Kochi',
      badge: 'Royal Heritage',
      icon: Castle,
      bgGradient: 'from-slate-950/90 to-indigo-950/70',
      img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
    },
  ];

  const stayMoods = [
    {
      title: 'Ayurveda & Wellness',
      subtitle: 'Holistic rejuvenation in nature',
      destination: 'Kerala',
      icon: Sparkles,
      img: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80',
    },
    {
      title: 'Tea Estate Bungalows',
      subtitle: 'Fresh mountain brews & rolling hills',
      destination: 'Munnar',
      icon: Coffee,
      img: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80',
    },
    {
      title: 'Sunset Beach Escapes',
      subtitle: 'Private sundecks & golden tides',
      destination: 'Goa',
      icon: Sunset,
      img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    },
    {
      title: 'Alpine Stargazing Cabins',
      subtitle: 'Clear skies & bonfire evenings',
      destination: 'Manali',
      icon: Tent,
      img: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=600&q=80',
    },
  ];

  const travelTips = [
    {
      icon: Luggage,
      title: 'Smart Packing Essentials',
      desc: 'Hill station evenings drop in temperature. Always pack breathable thermal layers and trail walking shoes for spice plantation treks.',
      badge: 'Prep Tip',
      accent: 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20',
    },
    {
      icon: ShieldCheck,
      title: 'VeriNova Check-in Protocol',
      desc: 'Have your digital government photo ID ready. Voyara properties provide seamless contactless arrival with verified host greeting.',
      badge: 'Arrival Protocol',
      accent: 'border-orange-500/30 bg-orange-50/50 dark:bg-orange-950/20',
    },
    {
      icon: Coffee,
      title: 'Authentic Local Experiences',
      desc: 'Support indigenous communities by booking host-guided organic tea tastings, sunrise kayaking, and traditional pottery sessions.',
      badge: 'Local Culture',
      accent: 'border-teal-500/30 bg-teal-50/50 dark:bg-teal-950/20',
    },
  ];

  const popularDestinations = [
    {
      name: 'Munnar',
      state: 'Kerala',
      type: 'Hill Sanctuary',
      img: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=300&q=80',
    },
    {
      name: 'Goa',
      state: 'West Coast',
      type: 'Beachfront',
      img: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=300&q=80',
    },
    {
      name: 'Wayanad',
      state: 'Kerala',
      type: 'Rainforest',
      img: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=300&q=80',
    },
    {
      name: 'Manali',
      state: 'Himachal',
      type: 'Alpine Valley',
      img: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=300&q=80',
    },
    {
      name: 'Kochi',
      state: 'Kerala',
      type: 'Heritage Harbour',
      img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=300&q=80',
    },
    {
      name: 'Ooty',
      state: 'Tamil Nadu',
      type: 'Tea Country',
      img: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=300&q=80',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* 1. Travel Hero Welcome Section */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-white via-[#F0FDF8] to-[#E6F7F2] dark:from-[#0B1528] dark:via-[#0F1D38] dark:to-[#081020] p-6 sm:p-8 md:p-10 transition-colors duration-200">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-20 dark:opacity-5 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500 via-teal-400 to-transparent"></div>

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/15 dark:bg-emerald-500/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-300" />
            <span>Voyara Explorer • VeriNova Protected Account</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-serif text-[#102A43] dark:text-white tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] || 'Traveler'}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
            Discover handpicked sanctuaries, authentic local experiences, and tranquil retreats verified for peace of mind.
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
                  placeholder="Search destinations, resorts, or experiences..."
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

      {/* 2. Quick Action Cards */}
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

      {/* 3. Trending Destination Gateways with Imagery */}
      <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-xl font-bold font-serif text-[#102A43] dark:text-white">
              Trending Destination Gateways
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Browse top handpicked regions with verified local hosts
            </p>
          </div>
          <Link
            to="/search"
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-0.5"
          >
            <span>Explore All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {popularDestinations.map((dest) => (
            <div
              key={dest.name}
              onClick={() => navigate(`/search?destination=${encodeURIComponent(dest.name)}`)}
              className="group relative rounded-2xl overflow-hidden aspect-4/5 cursor-pointer shadow-sm border border-slate-200/80 dark:border-slate-800 transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <img
                src={dest.img}
                alt={dest.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#FDBA9A] block">
                  {dest.type}
                </span>
                <h4 className="text-sm font-bold font-serif leading-tight mt-0.5">
                  {dest.name}
                </h4>
                <p className="text-[10px] text-slate-300">{dest.state}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Curated Stay Collections ("Escape by Setting") */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-xl font-bold font-serif text-[#102A43] dark:text-white">
              Curated Stay Collections
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Handpicked retreats tailored to your preferred landscape and architecture
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {travelCollections.map((col) => {
            const Icon = col.icon;
            return (
              <div
                key={col.title}
                onClick={() => navigate(`/search?destination=${encodeURIComponent(col.destination)}`)}
                className="group relative rounded-3xl overflow-hidden aspect-4/3 sm:aspect-16/11 cursor-pointer border border-slate-200/80 dark:border-slate-800 shadow-md transition-transform hover:-translate-y-1.5"
              >
                <img
                  src={col.img}
                  alt={col.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${col.bgGradient} opacity-90 group-hover:opacity-95 transition-opacity`} />

                <div className="absolute inset-0 p-5 flex flex-col justify-between text-white">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md">
                      {col.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm sm:text-base font-bold font-serif leading-snug">
                      {col.title}
                    </h3>
                    <p className="text-[11px] text-slate-200 mt-1 line-clamp-1 font-light">
                      {col.tagline}
                    </p>
                    <div className="flex items-center space-x-1 text-xs font-bold text-[#FDBA9A] mt-2 group-hover:translate-x-1 transition-transform">
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

      {/* 5. Stay Mood Explorer (4 visual cards) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base sm:text-xl font-bold font-serif text-[#102A43] dark:text-white">
            Find Your Stay Mood
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tailored escapes designed around your desired pace and experience
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stayMoods.map((mood) => {
            const Icon = mood.icon;
            return (
              <div
                key={mood.title}
                onClick={() => navigate(`/search?destination=${encodeURIComponent(mood.destination)}`)}
                className="p-4 bg-white dark:bg-[#131D2E] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1 space-y-3"
              >
                <div className="relative aspect-16/10 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={mood.img}
                    alt={mood.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2.5 right-2.5 w-8 h-8 rounded-xl bg-slate-900/80 backdrop-blur-md text-emerald-400 flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-[#102A43] dark:text-white font-serif group-hover:text-[#F97360] transition-colors">
                    {mood.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {mood.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. VeriNova™ Trust & Guarantee Showcase */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#102A43] to-[#0A1A2F] text-white space-y-6 shadow-xl border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>VeriNova™ Transactional Integrity Framework</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif">
              Built on Zero-Risk Smart Stay Guarantees
            </h2>
          </div>
          <Link
            to="/support"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/20"
          >
            Learn How We Protect Stays
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Lock className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Row-Level Lock Double-Booking Safety</h4>
            <p className="text-slate-300 leading-relaxed">
              Voyara uses atomic PostgreSQL row-level locks on room inventory during every transaction, ensuring simultaneous bookings never overlap.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 flex items-center justify-center text-[#F97360]">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Authoritative Transparent Pricing</h4>
            <p className="text-slate-300 leading-relaxed">
              Nightly room rates and experiences are calculated strictly on the backend with zero hidden surge fees or surprise commissions.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-300">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">100% Verified Hosts & Sanctuaries</h4>
            <p className="text-slate-300 leading-relaxed">
              Every property undergoes strict physical, legal, and operational verification before accepting reservations.
            </p>
          </div>
        </div>
      </div>

      {/* 7. Voyara Travel Readiness & Explorer Journal */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base sm:text-xl font-bold font-serif text-[#102A43] dark:text-white">
            Voyara Travel Readiness & Tips
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Insights to make your stay peaceful, sustainable, and effortless
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {travelTips.map((tip) => {
            const Icon = tip.icon;
            return (
              <div
                key={tip.title}
                className={`p-5 bg-white dark:bg-[#131D2E] rounded-3xl border ${tip.accent} shadow-xs space-y-3 flex flex-col justify-between`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {tip.badge}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#102A43] dark:text-white">
                    {tip.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {tip.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                    <span>Verified Guest Advice</span>
                    <CheckCircle2 className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 8. Dedicated Help & Support Callout */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-[#F97360] flex items-center justify-center shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Need assistance with your booking or stay?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Help & Support: <strong className="text-[#F97360]">adminvoyara@gmail.com</strong> • Direct 24/7 Concierge
            </p>
          </div>
        </div>

        <Link
          to="/customer/support"
          className="px-5 py-2.5 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-[#e05e4b] hover:to-orange-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all shrink-0 cursor-pointer flex items-center space-x-1.5"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Open Support Desk</span>
        </Link>
      </div>
    </div>
  );
};

export default CustomerDashboard;

