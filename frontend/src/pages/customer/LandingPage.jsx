import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  Sparkles,
  Home,
  Compass,
  Flame,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export const LandingPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleExploreClick = () => {
    if (isAuthenticated) {
      navigate('/customer');
    } else {
      navigate('/login', {
        state: {
          from: '/search',
          message: 'Sign in to discover stays, experiences, and places made for your next escape.',
        },
      });
    }
  };

  return (
    <div className="bg-[#FFF8F0] dark:bg-[#070D18] min-h-screen text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-200">
      {/* ==========================================
          1. HERO SECTION (Minimal, Travel-Focused, Sunset Coast)
      ========================================== */}
      <section className="relative min-h-[85vh] flex items-center pt-12 pb-24 px-4 sm:px-6 lg:px-8">
        {/* Background Travel Photography & Gradient Overlays */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1920&q=85"
            alt="Voyara Sanctuary Stay"
            className="w-full h-full object-cover object-center filter brightness-90"
          />
          {/* Sunset Coast Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-black/35" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/40 to-transparent" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Main Headline & CTAs */}
            <div className="lg:col-span-8 text-white space-y-6">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 shadow-sm">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-orange-300">
                  Stay. Explore. Experience.
                </span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black font-serif tracking-tight leading-[1.1] text-white">
                Your next escape <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F97360] to-orange-400">starts here.</span>
              </h1>

              <p className="text-lg sm:text-2xl text-white/90 max-w-2xl font-light leading-relaxed">
                Find a place to stay. Discover something unforgettable.
              </p>

              {/* Authentication-First CTAs */}
              <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <button
                  type="button"
                  onClick={handleExploreClick}
                  className="px-8 py-4 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white text-base font-bold rounded-2xl shadow-lg hover:shadow-orange-500/25 transition-all cursor-pointer flex items-center justify-center space-x-2 text-center"
                >
                  <span>Explore Voyara</span>
                  <ArrowRight className="w-5 h-5" />
                </button>

                {!isAuthenticated ? (
                  <Link
                    to="/register"
                    className="px-8 py-4 bg-white/15 hover:bg-white/25 text-white text-base font-semibold rounded-2xl backdrop-blur-md border border-white/30 transition-all text-center"
                  >
                    Create Account
                  </Link>
                ) : (
                  <Link
                    to="/customer"
                    className="px-8 py-4 bg-white/15 hover:bg-white/25 text-white text-base font-semibold rounded-2xl backdrop-blur-md border border-white/30 transition-all text-center"
                  >
                    Go to Dashboard
                  </Link>
                )}
              </div>
            </div>

            {/* Subtle Visual Feature Card */}
            <div className="lg:col-span-4 hidden lg:block">
              <div className="bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl text-white space-y-4 border border-white/10 shadow-2xl">
                <div className="aspect-4/3 rounded-2xl overflow-hidden shadow-inner">
                  <img
                    src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80"
                    alt="Sanctuary Homestay"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
                    Thoughtful Escapes
                  </span>
                  <h3 className="text-base font-serif font-bold text-white">
                    Sanctuaries Designed for Rest
                  </h3>
                  <p className="text-xs text-white/70 leading-relaxed">
                    Connecting discerning travelers with peaceful homestays, cottages, and curated host experiences.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================
          2. "WHAT IS VOYARA?" SECTION
      ========================================== */}
      <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Stay. Explore. Experience.</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black font-serif text-slate-900 dark:text-white leading-tight">
            Voyara brings stays and local experiences together in one simple place.
          </h2>

          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed font-light">
            Whether you are looking for a tranquil tea plantation homestay in the hills of Munnar, a secluded seaside cottage, or an authentic host-led adventure, Voyara provides a thoughtful bridge to meaningful travel.
          </p>
        </div>

        {/* ==========================================
            3. THREE VALUE BLOCKS (STAY / EXPLORE / EXPERIENCE)
        ========================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          {/* STAY */}
          <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-8 border border-[#FDBA9A]/30 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Home className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold font-serif text-slate-900 dark:text-white">Stay</h3>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Find comfortable places that feel like your own.
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Handpicked homestays, cottages, villas, camps, and boutique retreats curated for peace and comfort.
            </p>
          </div>

          {/* EXPLORE */}
          <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-8 border border-[#FDBA9A]/30 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold font-serif text-slate-900 dark:text-white">Explore</h3>
            <p className="text-sm font-semibold text-orange-500">
              Discover destinations worth experiencing.
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              From mist-covered Western Ghat tea slopes to pristine coastal waters, discover places with authentic character.
            </p>
          </div>

          {/* EXPERIENCE */}
          <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-8 border border-[#FDBA9A]/30 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Flame className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold font-serif text-slate-900 dark:text-white">Experience</h3>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Make your trip memorable with local experiences.
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Host-led nature treks, acoustic campfire evenings, spice farm cookery, and genuine regional activities.
            </p>
          </div>
        </div>
      </section>

      {/* ==========================================
          4. VERINOVA TRUST SECTION (Minimal & Focused)
      ========================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-8 sm:p-12 border border-emerald-500/30 dark:border-slate-800 shadow-sm">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Verified by VeriNova</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black font-serif text-slate-900 dark:text-white">
              Booking confidence with <span className="text-emerald-600 dark:text-emerald-400">VeriNova</span>
            </h3>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Voyara checks booking details, availability, pricing, capacity, and transaction consistency before confirmation.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Availability Verified:</strong> Room and blackout calendar checks eliminate double bookings.</span>
              </div>
              <div className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Capacity Enforced:</strong> Host experience participant limits strictly calculated in real time.</span>
              </div>
              <div className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Price Accuracy:</strong> Server-side rate validation ensures exact checkout totals.</span>
              </div>
              <div className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Audit Trail:</strong> Every confirmed reservation generates an itemized audit inspection ID.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================
          5. FINAL CALL TO ACTION
      ========================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-950 text-white rounded-3xl p-10 sm:p-16 text-center space-y-6 shadow-xl relative overflow-hidden border border-emerald-500/20">
          <div className="max-w-2xl mx-auto space-y-3 relative z-10">
            <h3 className="text-3xl sm:text-5xl font-black font-serif text-white">
              Ready to find your place?
            </h3>
            <p className="text-sm sm:text-base text-slate-300 font-light">
              Sign in or create an account to discover handpicked stays, curated host experiences, and seamless travel reservations.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-center items-center gap-4 relative z-10">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/register"
                  className="px-8 py-3.5 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  Get Started
                </Link>
                <Link
                  to="/login"
                  className="px-8 py-3.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl border border-white/20 transition-all"
                >
                  Sign In
                </Link>
              </>
            ) : (
              <Link
                to="/customer"
                className="px-8 py-3.5 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                Go to Dashboard
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
