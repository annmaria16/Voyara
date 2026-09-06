import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../../components/common/Logo';
import { ShieldCheck, Compass, Sparkles, Home, Flame, CheckCircle2, ArrowRight } from 'lucide-react';

export const AboutPage = () => {
  return (
    <div className="min-h-screen bg-[#FFF8F0] dark:bg-[#070D18] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Simple Header */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
        <Logo size="md" />
        <div className="flex items-center space-x-4">
          <Link
            to="/"
            className="text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-orange-500 transition-colors"
          >
            Home
          </Link>
          <Link
            to="/login"
            className="px-4 py-2 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
          >
            Sign In
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Find Your Place.</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black font-serif tracking-tight text-slate-900 dark:text-white">
            Stay. Explore. Experience.
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-light leading-relaxed">
            Voyara is an authentic accommodation and experience marketplace connecting mindful travellers with passionate hosts across unforgettable hill stations, coastal retreats, and heritage villas.
          </p>
        </div>

        {/* Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 rounded-3xl space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Home className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white">
              Handpicked Stays
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              From mountain cottages in Munnar and Manali to beachfront villas in Goa and lakeside retreats in Udaipur, every stay is hosted with pride.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 rounded-3xl space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <Flame className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white">
              Local Experiences
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Guided tea plantation treks, backwater kayaking, campfires, and authentic culinary journeys curated directly by your local hosts.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 rounded-3xl space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white">
              VeriNova Trust Layer
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Voyara integrates VeriNova — an internal transaction and inventory verification engine that ensures real-time pricing accuracy and prevents double-bookings.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="p-8 sm:p-12 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-950 rounded-3xl text-white text-center space-y-4 shadow-xl border border-emerald-500/30">
          <h2 className="text-2xl sm:text-3xl font-black font-serif text-white">
            Ready to discover your next getaway?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto font-light">
            Join thousands of travellers and hosts creating memorable stays.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link
              to="/register"
              className="px-6 py-3 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-all"
            >
              Explore Dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};
