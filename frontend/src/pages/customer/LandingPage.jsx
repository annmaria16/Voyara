import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  Sparkles,
  Home,
  Compass,
  Flame,
  CheckCircle2,
  ArrowRight,
  MapPin,
  Calendar,
  Users,
  ChevronRight,
  ChevronLeft,
  Star,
  Award,
  Lock,
  Search,
  Pause,
  Play,
  Check,
  Mountain,
  Palmtree,
  TreePine,
  Castle,
  Coffee,
  Sun,
  Waves,
} from 'lucide-react';

export const LandingPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchDestination, setSearchDestination] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);
  const autoplayTimerRef = useRef(null);

  // Ultra High-Definition, Aesthetic Luxury Vibe Villas Photography
  const heroSlides = [
    {
      id: 1,
      image: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=2400&q=95',
      badge: 'Tropical Oceanfront Villas',
      location: 'South Goa Coast, India',
      headingStart: 'Wake up somewhere',
      headingHighlight: 'extraordinary.',
      subheading: 'Private beachfront villas with crystal-clear infinity pools, swaying palms, and golden ocean sunsets.',
      cta: 'Explore Beach Villas',
      query: 'Goa',
      accentColor: '#38BDF8',
      badgeClass: 'bg-sky-500/30 border-sky-400 text-sky-200 shadow-sky-500/20',
      dotColor: '#38BDF8',
      btnGradient: 'from-sky-500 to-[#087F8C] hover:from-sky-400 hover:to-[#0F9D9A]',
      textColor: 'text-sky-300',
    },
    {
      id: 2,
      image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2400&q=95',
      badge: 'Panoramic Hilltop Villas',
      location: 'Munnar & Western Ghats',
      headingStart: 'Your private hillside sanctuary',
      headingHighlight: 'starts here.',
      subheading: 'Cantilevered infinity decks, private warm jacuzzi pools, and misty emerald mountain horizons.',
      cta: 'Explore Mountain Villas',
      query: 'Munnar',
      accentColor: '#34D399',
      badgeClass: 'bg-emerald-500/30 border-emerald-400 text-emerald-200 shadow-emerald-500/20',
      dotColor: '#34D399',
      btnGradient: 'from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500',
      textColor: 'text-emerald-300',
    },
    {
      id: 3,
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2400&q=95',
      badge: 'Architectural Designer Villas',
      location: 'Alibaug, Maharashtra',
      headingStart: 'Stay somewhere you will',
      headingHighlight: 'truly remember.',
      subheading: 'Floor-to-ceiling glass pavilions, illuminated private pools, and bespoke luxury hospitality.',
      cta: 'Explore Designer Villas',
      query: 'Resort',
      accentColor: '#FBBF24',
      badgeClass: 'bg-amber-500/30 border-amber-400 text-amber-200 shadow-amber-500/20',
      dotColor: '#FBBF24',
      btnGradient: 'from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500',
      textColor: 'text-amber-300',
    },
    {
      id: 4,
      image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=2400&q=95',
      badge: 'Alpine Forest Chalet Villas',
      location: 'Manali, Himachal Pradesh',
      headingStart: 'Find comfort in unexpected',
      headingHighlight: 'high altitudes.',
      subheading: 'Warm cedarwood chalets with stone hearths, private hot tubs, and snowy mountain peaks.',
      cta: 'Explore Forest Chalets',
      query: 'Manali',
      accentColor: '#FB923C',
      badgeClass: 'bg-orange-500/30 border-orange-400 text-orange-200 shadow-orange-500/20',
      dotColor: '#FB923C',
      btnGradient: 'from-orange-500 to-[#EA580C] hover:from-orange-400 hover:to-orange-600',
      textColor: 'text-orange-300',
    },
    {
      id: 5,
      image: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=2400&q=95',
      badge: 'Royal Courtyard Havelis',
      location: 'Jaipur, Rajasthan',
      headingStart: 'Experience timeless royal',
      headingHighlight: 'heritage & luxury.',
      subheading: 'Centuries-old stone archways, open-air private pools, brass lanterns, and royal dining.',
      cta: 'Explore Heritage Havelis',
      query: 'Jaipur',
      accentColor: '#FDE047',
      badgeClass: 'bg-yellow-500/30 border-yellow-400 text-yellow-200 shadow-yellow-500/20',
      dotColor: '#FDE047',
      btnGradient: 'from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500',
      textColor: 'text-yellow-300',
    },
    {
      id: 6,
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=2400&q=95',
      badge: 'Modern Waterfront Estates',
      location: 'Udaipur, Rajasthan',
      headingStart: 'Find your perfect place in',
      headingHighlight: 'sheer luxury.',
      subheading: 'Exclusive lakeside villas with sun loungers, private plunge pools, and serene sunset vistas.',
      cta: 'Explore Luxury Estates',
      query: 'Villa',
      accentColor: '#2DD4BF',
      badgeClass: 'bg-teal-500/30 border-teal-400 text-teal-200 shadow-teal-500/20',
      dotColor: '#2DD4BF',
      btnGradient: 'from-[#087F8C] to-[#0F9D9A] hover:from-teal-500 hover:to-[#27B7A8]',
      textColor: 'text-teal-300',
    },
  ];

  // Preload all high-res slide images for zero flicker on rapid cycling
  useEffect(() => {
    heroSlides.forEach((slide) => {
      const img = new window.Image();
      img.src = slide.image;
    });
  }, []);

  const resetAutoplayTimer = () => {
    if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    autoplayTimerRef.current = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 4500);
  };

  // Autoplay slideshow (stays on each slide for 4.5 seconds for calm, cinematic viewing)
  useEffect(() => {
    resetAutoplayTimer();
    return () => {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    };
  }, [heroSlides.length]);

  const handleNextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    resetAutoplayTimer();
  };

  const handlePrevSlide = () => {
    setActiveSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
    resetAutoplayTimer();
  };

  const handleSelectSlide = (idx) => {
    setActiveSlide(idx);
    resetAutoplayTimer();
  };

  const handleExploreClick = (path = '/search') => {
    if (isAuthenticated) {
      navigate(path);
    } else {
      navigate('/login', {
        state: {
          from: path,
          message: 'Login to explore and book stays.',
        },
      });
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const target = searchDestination.trim()
      ? `/search?destination=${encodeURIComponent(searchDestination.trim())}`
      : '/search';
    handleExploreClick(target);
  };

  const currentSlide = heroSlides[activeSlide] || heroSlides[0];

  // Handpicked Categories
  const stayCategories = [
    {
      title: 'Tea Estate Lodges',
      tagline: 'Perched amidst rolling emerald plantations & morning mist',
      location: 'Munnar, Ooty, Wayanad',
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
      type: 'Homestay',
      badge: 'Tea Plantation',
      icon: Mountain,
    },
    {
      title: 'Coastal Hideaways',
      tagline: 'Step directly from your deck onto private golden sands',
      location: 'South Goa, Gokarna, Varkala',
      image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
      type: 'Villa',
      badge: 'Beachfront',
      icon: Waves,
    },
    {
      title: 'Eco-Resort Havens',
      tagline: 'Forest canopies, natural spring pools & wildlife sounds',
      location: 'Kabini, Thekkady, Dandeli',
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
      type: 'Resort',
      badge: 'Eco-Luxury',
      icon: TreePine,
    },
    {
      title: 'Luxury Villas',
      tagline: 'Private infinity pools & panoramic mountain horizons',
      location: 'Udaipur, Alibaug, Lonavala',
      image: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=800&q=80',
      type: 'Villa',
      badge: 'Private Estate',
      icon: Coffee,
    },
    {
      title: 'Heritage Homes',
      tagline: 'Centuries-old ancestral estates & royal havelis',
      location: 'Jaipur, Chettinad, Fort Kochi',
      image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80',
      type: 'Homestay',
      badge: 'Heritage',
      icon: Castle,
    },
  ];

  // Experience Highlights
  const experienceHighlights = [
    {
      title: 'Sunrise Tea Plucking & Tasting Tour',
      desc: 'Join local tea masters at dawn through heritage Nilgiri & Munnar plantations.',
      badge: 'Heritage Tour',
      image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Bioluminescent Kayaking Experience',
      desc: 'Paddle through glowing backwaters under starlit midnight skies in Goa.',
      badge: 'Night Adventure',
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Ancestral Clay Pottery Workshop',
      desc: 'Handcraft authentic terracotta tableware with Master Craftsmen in Jaipur.',
      badge: 'Artisan Workshop',
      image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Wayanad High Peak Cloud Trek',
      desc: 'Guided eco-trek through misty shola forests with panoramic Western Ghat vistas.',
      badge: 'Guided Trek',
      image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Traditional Ayurvedic Herb Garden Walk',
      desc: 'Discover ancient botanical wellness secrets in ancestral organic spice gardens.',
      badge: 'Wellness',
      image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Chettinad Royal Spice & Cooking Masterclass',
      desc: 'Learn time-honored slow cooking techniques inside a 120-year-old heritage mansion.',
      badge: 'Culinary',
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    },
  ];

  // VeriNova Verification Steps
  const verinovaFlow = [
    { step: '01', name: 'Traveler', desc: 'Authenticated traveler profile' },
    { step: '02', name: 'Property', desc: 'Verified location & host credentials' },
    { step: '03', name: 'Room', desc: 'Confirmed unit plan & inventory' },
    { step: '04', name: 'Availability', desc: 'Real-time blackout & schedule check' },
    { step: '05', name: 'Experience', desc: 'Slot & capacity alignment' },
    { step: '06', name: 'Price Lock', desc: 'Authoritative server rate guarantee' },
    { step: '07', name: 'Security Hash', desc: 'SHA-256 state seal generation' },
    { step: '08', name: 'Verification', desc: 'Cryptographically certified pass' },
  ];

  return (
    <div className="bg-[#FFFDF7] dark:bg-[#091B29] text-[#091B29] dark:text-slate-100 min-h-screen transition-colors duration-200">
      
      {/* =========================================================================
          SECTION 1: CINEMATIC HERO SLIDESHOW (FAST 1.5s CYCLES, ULTRA-CLEAR HD)
      ========================================================================= */}
      <section className="relative min-h-[92vh] flex items-center justify-center pt-8 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden select-none">
        {/* Background Image Carousel Layer with Clear Crossfade */}
        {heroSlides.map((slide, idx) => (
          <div
            key={slide.id}
            className={`absolute inset-0 z-0 transition-opacity duration-500 ease-in-out ${
              idx === activeSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <img
              src={slide.image}
              alt={slide.badge}
              className={`w-full h-full object-cover object-center filter brightness-[1.02] contrast-[1.06] saturate-[1.12] transform transition-transform duration-2000 ease-out ${
                idx === activeSlide ? 'scale-105' : 'scale-100'
              }`}
            />
            {/* Crisp Reading Scrims — Transparent, vibrant, avoiding muddy blur */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent/10 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#091B29]/80 via-transparent to-black/20 pointer-events-none" />
          </div>
        ))}

        {/* Hero Content Container */}
        <div className="relative z-10 max-w-7xl mx-auto w-full pt-10">
          <div className="max-w-3xl text-white space-y-6">
            
            {/* Slide Category Badge & Location (Color-matched to current slide) */}
            <div className={`inline-flex items-center space-x-2.5 px-4 py-1.5 rounded-full backdrop-blur-md border shadow-lg animate-in fade-in duration-300 ${currentSlide.badgeClass}`}>
              <span
                className="w-2.5 h-2.5 rounded-full animate-pulse shadow-sm"
                style={{ backgroundColor: currentSlide.accentColor }}
              />
              <span className="text-xs font-black tracking-widest uppercase drop-shadow-sm">
                {currentSlide.badge}
              </span>
              <span className="text-white/60">•</span>
              <span className="text-xs font-bold text-white drop-shadow-md">
                {currentSlide.location}
              </span>
            </div>

            {/* Cinematic Editorial Heading with Themed Highlight */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black font-serif tracking-tight leading-[1.08] text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
              {currentSlide.headingStart}{' '}
              <span
                className="transition-colors duration-300 drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]"
                style={{ color: currentSlide.accentColor }}
              >
                {currentSlide.headingHighlight}
              </span>
            </h1>

            {/* Subtitle with High-Definition Readability and Theme Color Matching */}
            <p className="text-lg sm:text-2xl text-white font-semibold leading-relaxed max-w-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
              {currentSlide.subheading}
            </p>

            {/* Travel Search Dock */}
            <form
              onSubmit={handleSearchSubmit}
              className="pt-2 flex flex-col sm:flex-row items-stretch gap-3 max-w-2xl bg-white/95 dark:bg-[#0F273D]/95 p-2.5 rounded-2xl sm:rounded-full shadow-2xl backdrop-blur-md border border-white/30"
            >
              <div className="flex-1 flex items-center space-x-3 px-4 py-2">
                <MapPin className="w-5 h-5 text-[#087F8C] shrink-0" />
                <input
                  type="text"
                  placeholder="Where do you want to stay? (e.g. Munnar, Goa, Manali, Jaipur)"
                  value={searchDestination}
                  onChange={(e) => setSearchDestination(e.target.value)}
                  className="w-full bg-transparent text-[#091B29] dark:text-white placeholder-slate-400 text-sm font-semibold focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="px-7 py-3.5 bg-gradient-to-r from-orange-500 to-[#EA580C] hover:from-orange-600 hover:to-[#c2410c] text-white font-bold text-sm rounded-xl sm:rounded-full shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center space-x-2 shrink-0 cursor-pointer font-sans group"
              >
                <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Search Stays</span>
              </button>
            </form>

            {/* Main Action CTAs with Theme-matched styling */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => handleExploreClick(`/search?destination=${encodeURIComponent(currentSlide.query)}`)}
                className={`px-7 py-3.5 bg-gradient-to-r ${currentSlide.btnGradient} text-white text-sm font-bold rounded-xl shadow-lg transition-all flex items-center space-x-2 cursor-pointer border border-white/20`}
              >
                <span>{currentSlide.cta}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <Link
                to="/register"
                className="px-7 py-3.5 bg-white/20 hover:bg-white/30 text-white text-sm font-bold rounded-xl backdrop-blur-md border border-white/35 transition-all shadow-md"
              >
                Register
              </Link>
            </div>
          </div>
        </div>

        {/* Carousel Interactive Controls (Without Play Button) */}
        <div className="absolute bottom-8 left-4 sm:left-8 right-4 sm:right-8 max-w-7xl mx-auto flex items-center justify-between text-white z-20 pointer-events-none">
          {/* Dot Indicators & Slide Numbers */}
          <div className="flex items-center space-x-3 pointer-events-auto bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-lg">
            {heroSlides.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelectSlide(idx)}
                className={`transition-all cursor-pointer rounded-full ${
                  idx === activeSlide
                    ? 'w-8 h-2 shadow-sm'
                    : 'w-2 h-2 bg-white/50 hover:bg-white'
                }`}
                style={idx === activeSlide ? { backgroundColor: s.accentColor } : {}}
                title={`Slide ${idx + 1}`}
              />
            ))}
            <span className="text-[11px] font-bold text-white/90 ml-2 font-mono">
              0{activeSlide + 1} / 0{heroSlides.length}
            </span>
          </div>

          {/* Prev / Next Manual Navigation Controls (Play button removed) */}
          <div className="flex items-center space-x-2 pointer-events-auto">
            <button
              type="button"
              onClick={handlePrevSlide}
              className="p-3 rounded-full bg-black/50 hover:bg-black/75 backdrop-blur-md text-white border border-white/20 transition-all hover:scale-105 shadow-lg cursor-pointer"
              title="Previous Slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextSlide}
              className="p-3 rounded-full bg-black/50 hover:bg-black/75 backdrop-blur-md text-white border border-white/20 transition-all hover:scale-105 shadow-lg cursor-pointer"
              title="Next Slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: "STAY SOMEWHERE THAT FEELS LIKE YOURS" (ROOM & STAY SLIDER)
      ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div className="space-y-3 max-w-2xl">
            <h2 className="text-3xl sm:text-5xl font-black font-serif text-[#17324D] dark:text-white">
              Stay somewhere that feels like yours.
            </h2>
            <p className="text-base text-[#607080] dark:text-slate-300 font-light">
              From historic Kerala ancestral homes to cliffside cottages and tea plantation estates, discover accommodations with genuine soul.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleExploreClick('/search')}
            className="inline-flex items-center space-x-2 text-sm font-bold text-[#F97316] hover:text-[#FF8A3D] transition-colors self-start md:self-auto cursor-pointer font-sans"
          >
            <span>View All Accommodations</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Editorial Layout with Varied Card Compositions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stayCategories.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                onClick={() => handleExploreClick(`/search?property_type=${item.type}`)}
                className="group cursor-pointer rounded-3xl overflow-hidden card-voyara card-lift border border-[#E0ECEF] dark:border-white/10 flex flex-col justify-between"
              >
                <div className="relative h-64 overflow-hidden bg-slate-100 dark:bg-slate-800 img-zoom-container">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {/* Category Pill */}
                  <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/95 dark:bg-[#091B29]/90 backdrop-blur-md text-[11px] font-black uppercase tracking-wider text-[#087F8C] dark:text-[#27B7A8] shadow-sm border border-[#087F8C]/20">
                    {item.badge}
                  </span>

                  {/* Icon on top right */}
                  <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white">
                    <Icon className="w-4 h-4 text-[#F6C945]" />
                  </div>

                  {/* Title and location on bottom */}
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <p className="text-[11px] font-semibold text-[#F6C945] uppercase tracking-wider">
                      {item.location}
                    </p>
                    <h3 className="text-xl font-bold font-serif text-white group-hover:text-[#F6C945] transition-colors">
                      {item.title}
                    </h3>
                  </div>
                </div>

                <div className="p-5 bg-white dark:bg-[#0F273D] space-y-3 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-[#607080] dark:text-slate-300 leading-relaxed font-light">
                    {item.tagline}
                  </p>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-[#087F8C] dark:text-[#27B7A8]">
                    <span>Explore verified stays</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: "STAY. EXPLORE. EXPERIENCE." (EDITORIAL EXPERIENCES)
      ========================================================================= */}
      <section className="bg-[#FFFDF7] dark:bg-[#0B1E2E]/60 py-20 border-y border-[#E0ECEF] dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <h2 className="text-3xl sm:text-5xl font-black font-serif text-[#17324D] dark:text-white">
              Stay. Explore. Experience.
            </h2>
            <p className="text-base text-[#607080] dark:text-slate-300 font-light leading-relaxed">
              Voyara does not just book four walls. Pair your stay with authentic stay partner-led experiences that turn a standard trip into a lifelong memory.
            </p>
          </div>

          {/* 6 Experience Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {experienceHighlights.map((exp, idx) => (
              <div
                key={idx}
                onClick={() => handleExploreClick('/experiences')}
                className="group cursor-pointer rounded-3xl overflow-hidden card-voyara card-lift border border-[#E0ECEF] dark:border-white/10 flex flex-col justify-between"
              >
                <div className="relative h-56 overflow-hidden bg-slate-100 dark:bg-slate-800 img-zoom-container">
                  <img
                    src={exp.image}
                    alt={exp.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/95 dark:bg-[#091B29]/90 backdrop-blur-md text-[11px] font-bold text-[#F97316] uppercase tracking-wider">
                    {exp.badge}
                  </span>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-lg font-bold font-serif text-white group-hover:text-[#F6C945] transition-colors">
                      {exp.title}
                    </h3>
                  </div>
                </div>

                <div className="p-5 bg-white dark:bg-[#0F273D] space-y-3 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-[#607080] dark:text-slate-300 leading-relaxed font-light">
                    {exp.desc}
                  </p>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-[#087F8C] dark:text-[#27B7A8]">
                    <span>Browse experience</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <button
              type="button"
              onClick={() => handleExploreClick('/experiences')}
              className="inline-flex items-center space-x-2 px-8 py-3.5 bg-[#087F8C] hover:bg-[#0F9D9A] text-white text-xs font-bold rounded-2xl shadow-md transition-all cursor-pointer"
            >
              <span>Explore All Curated Experiences</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: VERINOVA (TRUST & TRANSACTION INTEGRITY ENGINE)
      ========================================================================= */}
      <section id="verinova" className="bg-[#087F8C] dark:bg-[#091B29] text-white py-24 border-y border-white/15 relative overflow-hidden">
        {/* Subtle Background Glows */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#27B7A8]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#F6C945]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/15 text-[#F6C945] text-xs font-extrabold uppercase tracking-wider border border-white/20">
              <ShieldCheck className="w-4 h-4 text-[#F6C945]" />
              <span>VeriNova Integrity Engine</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black font-serif text-white">
              Travel with confidence.
            </h2>

            <p className="text-base text-white/90 font-light leading-relaxed">
              VeriNova checks the consistency of your booking before confirmation. Every reservation is verified across rates, blackout schedules, and inventory to prevent double-bookings or surprise charges.
            </p>
          </div>

          {/* 8-Node Visual Verification Pipeline */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 relative">
            {verinovaFlow.map((node, idx) => (
              <div
                key={idx}
                className="bg-white/10 hover:bg-white/15 border border-white/15 p-4 rounded-2xl backdrop-blur-md space-y-2 relative group transition-all text-center flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black font-mono text-[#F6C945]">{node.step}</span>
                  <div className="w-5 h-5 rounded-full bg-[#35A66F]/40 flex items-center justify-center text-[#DDF3E7]">
                    <Check className="w-3 h-3 text-[#DDF3E7]" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white tracking-wide">{node.name}</h3>
                  <p className="text-[10px] text-white/70 leading-tight mt-0.5 font-light">{node.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 100% Verification Guarantee Banner */}
          <div className="mt-12 p-6 rounded-2xl bg-white/10 border border-white/20 max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-[#35A66F]/30 flex items-center justify-center text-[#DDF3E7] shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Server-Validated Consistency Guarantee</p>
                <p className="text-xs text-white/75">Zero double-bookings, verified host profiles, and tamper-proof invoices.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleExploreClick('/search')}
              className="px-6 py-3 bg-[#F97316] hover:bg-[#FF8A3D] text-white text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer font-sans shadow-md"
            >
              Book with Confidence
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: BECOME A HOST (CALL TO ACTION)
      ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-[#E0ECEF] dark:border-white/10">
          {/* Host Background Photography */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1800&q=85"
              alt="Become a Stay Partner on Voyara"
              className="w-full h-full object-cover filter brightness-50"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#091B29]/95 via-[#091B29]/75 to-transparent" />
          </div>

          <div className="relative z-10 p-8 sm:p-16 max-w-2xl text-white space-y-6">
            <h2 className="text-3xl sm:text-5xl font-black font-serif text-white leading-tight">
              Have a place worth sharing?
            </h2>

            <p className="text-base text-white/85 font-light leading-relaxed">
              Turn your property into someone's next unforgettable stay. List your homestay, boutique resort, cottage, or villa. Manage room inventory, schedule local experiences, and welcome travelers from across India.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Link
                to="/register"
                className="px-8 py-4 bg-[#F97316] hover:bg-[#FF8A3D] text-white text-sm font-bold rounded-2xl shadow-lg transition-all text-center font-sans"
              >
                Register
              </Link>
              <Link
                to="/login"
                className="px-8 py-4 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold rounded-2xl backdrop-blur-md border border-white/20 transition-all text-center"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};


