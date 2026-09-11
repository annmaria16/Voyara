import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { providerApi } from '../../api/provider';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { CalendarWidget } from '../../components/dashboard/CalendarWidget';
import {
  BookOpen,
  DollarSign,
  Home,
  PlusCircle,
  ArrowRight,
  ChevronRight,
  MapPin,
  Layers,
  Sparkles,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Mail,
  MessageSquare,
  TrendingUp,
  Users,
  Compass,
  BedDouble,
  Clock,
  Star,
  Award,
  Zap,
} from 'lucide-react';

export const ProviderDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [properties, setProperties] = useState([]);
  const [trustData, setTrustData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, propsRes, trustRes] = await Promise.all([
          providerApi.getDashboard().catch(() => null),
          providerApi.getProperties().catch(() => []),
          providerApi.getTrust().catch(() => null),
        ]);
        setDashboardData(dashRes);
        setProperties(Array.isArray(propsRes) ? propsRes : []);
        setTrustData(trustRes);
      } catch (err) {
        console.error('Error fetching host dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = dashboardData?.stats || {};
  const recentBookings = dashboardData?.recent_bookings || [];

  const totalPropsCount = stats.total_properties ?? properties.length ?? 0;
  const totalBookingsCount = stats.total_bookings ?? 0;
  const confirmedBookingsCount = stats.confirmed_bookings ?? 0;
  const totalRevenueAmount = stats.total_revenue ?? 0;
  const totalRoomsCount = stats.total_rooms ?? 0;

  // Primary / Featured Property Image
  const featuredProperty = properties[0];
  const featuredImg =
    featuredProperty?.images?.[0]?.image_url ||
    featuredProperty?.image_url ||
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1600&q=85';

  // Extract live booked dates from actual database bookings for current month
  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const currentYearNum = now.getFullYear();
  const currentMonthName = now.toLocaleString('default', { month: 'long' });

  const bookedDays = [];
  recentBookings.forEach((b) => {
    if (b.check_in && b.check_out) {
      const start = new Date(b.check_in);
      const end = new Date(b.check_out);
      if (start.getFullYear() === currentYearNum && start.getMonth() === currentMonthIdx) {
        for (let d = start.getDate(); d <= Math.min(31, end.getDate()); d++) {
          if (!bookedDays.includes(d)) bookedDays.push(d);
        }
      }
    }
  });

  return (
    <div className="space-y-10">
      {/* 1. Hero: "Host Hospitality Studio" with Featured Property Banner */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-teal-500/20 bg-[#091B29]">
        {/* Background Image Overlay */}
        <div className="absolute inset-0">
          <img
            src={featuredImg}
            alt="Stay Partner Dashboard"
            className="w-full h-full object-cover opacity-40 filter brightness-90 transform scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#091B29]/95 via-[#091B29]/85 to-[#087F8C]/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#091B29] via-transparent to-transparent" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 p-6 sm:p-10 lg:p-14 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[#27B7A8] text-xs font-bold tracking-wide">
              <ShieldCheck className="w-4 h-4 text-[#27B7A8]" />
              <span>Stay Partner Dashboard • Operations & Inventory</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-serif text-white tracking-tight leading-tight">
              Stay Partner Dashboard
            </h1>

            <p className="text-sm sm:text-base text-slate-200 font-light leading-relaxed">
              Welcome back, <strong className="text-white font-medium">{dashboardData?.provider?.business_name || user?.name || 'Stay Partner'}</strong>. 
              {featuredProperty ? (
                <> Managing <strong className="text-[#F6C945] font-medium">{featuredProperty.name}</strong> and {totalPropsCount} verified properties across India.</>
              ) : (
                <> Ready to welcome mindful travelers to your authentic stays.</>
              )}
            </p>
          </div>

          {/* Quick Action Dock */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/provider/properties/new"
              className="inline-flex items-center space-x-2 px-6 py-3.5 bg-gradient-to-r from-orange-500 to-[#EA580C] hover:from-orange-600 hover:to-orange-700 text-white text-xs font-bold rounded-2xl shadow-xl shadow-orange-500/25 hover:scale-[1.02] active:scale-98 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>List New Property</span>
            </Link>
            <Link
              to="/provider/bookings"
              className="inline-flex items-center space-x-2 px-6 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-bold rounded-2xl shadow-sm hover:scale-[1.02] active:scale-98 transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-[#27B7A8]" />
              <span>Arrivals & Guests</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Four Operational Metric Pedestals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Revenue */}
        <div className="p-6 bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Gross Partner Revenue
            </span>
            <p className="text-2xl sm:text-3xl font-serif font-black text-orange-600 dark:text-orange-400">
              ₹{totalRevenueAmount.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-[#087F8C] dark:text-[#27B7A8] font-medium">
              Verified payouts ledger
            </p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 shadow-xs">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Active Properties */}
        <div className="p-6 bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Active Properties
            </span>
            <p className="text-2xl sm:text-3xl font-serif font-black text-[#091B29] dark:text-white">
              {String(totalPropsCount).padStart(2, '0')} <span className="text-xs font-sans font-normal text-slate-500">Stays</span>
            </p>
            <p className="text-[11px] text-[#087F8C] dark:text-[#27B7A8] font-medium">
              {stats.active_properties ?? totalPropsCount} published in discovery
            </p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-[#087F8C]/10 text-[#087F8C] dark:text-[#27B7A8] flex items-center justify-center shrink-0 shadow-xs">
            <Home className="w-6 h-6" />
          </div>
        </div>

        {/* Total Bookings */}
        <div className="p-6 bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Reservations
            </span>
            <p className="text-2xl sm:text-3xl font-serif font-black text-[#091B29] dark:text-white">
              {String(totalBookingsCount).padStart(2, '0')} <span className="text-xs font-sans font-normal text-slate-500">Guests</span>
            </p>
            <p className="text-[11px] text-[#35A66F] font-medium">
              ✓ {confirmedBookingsCount} Confirmed
            </p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-emerald-500/10 text-[#35A66F] flex items-center justify-center shrink-0 shadow-xs">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        {/* Host Satisfaction */}
        <div className="p-6 bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Stay Partner Trust Score
            </span>
            <p className="text-2xl sm:text-3xl font-serif font-black text-[#091B29] dark:text-white flex items-center space-x-1">
              <span>4.98</span>
              <Star className="w-5 h-5 text-[#F6C945] fill-current" />
            </p>
            <p className="text-[11px] text-orange-600 dark:text-orange-400 font-medium">
              VeriNova Verified Partner
            </p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-[#F6C945]/15 text-[#D97706] dark:text-[#F6C945] flex items-center justify-center shrink-0 shadow-xs">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* YOUR VOYARA TRUST SECTION */}
      <div className="bg-gradient-to-r from-[#091B29] via-[#0F273D] to-[#091B29] border border-teal-900/40 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-teal-900/50 pb-5">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#087F8C] to-[#091B29] border border-teal-500/30 flex items-center justify-center text-[#27B7A8] shadow-md">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#27B7A8]">
                  Trust & Integrity
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {trustData?.overall_trust_level?.replace(/_/g, ' ') || 'ACTIVE STAY PARTNER'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-white mt-0.5">
                Your Voyara Trust
              </h2>
            </div>
          </div>

          <div className="text-right sm:text-right">
            <div className="text-xs text-slate-300">
              {trustData?.is_new_host || trustData?.new_host_baseline_applied ? (
                <span className="inline-flex items-center space-x-1 text-amber-300 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/30 font-bold">
                  <span>New Stay Partner – Limited Platform History</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1.5 text-emerald-300 font-bold">
                  <Sparkles className="w-4 h-4 text-[#F6C945]" />
                  <span>Platform Trust Score: {trustData?.overall_trust_score ?? 85}/100</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 4 Trust Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Phone Verification */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400">Phone Verification</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <strong className="block text-sm text-white font-medium">
              {trustData?.phone_verified ? '✓ Indian Mobile (+91)' : 'Pending'}
            </strong>
            <p className="text-[11px] text-slate-400 font-light">
              Secure OTP verified on registration
            </p>
          </div>

          {/* Email Verification */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400">Email Verification</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <strong className="block text-sm text-white font-medium">
              {trustData?.email_verified ? '✓ Email Verified' : 'Pending'}
            </strong>
            <p className="text-[11px] text-slate-400 font-light">
              Stay Partner notifications & security active
            </p>
          </div>

          {/* Account Status */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400">Account Status</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <strong className="block text-sm text-emerald-300 font-medium">
              {trustData?.account_status || 'ACTIVE'}
            </strong>
            <p className="text-[11px] text-slate-400 font-light">
              Full access to stay partner tools
            </p>
          </div>

          {/* Profile Completeness */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400">Profile Completeness</span>
              <Sparkles className="w-4 h-4 text-[#F6C945]" />
            </div>
            <strong className="block text-sm text-[#F6C945] font-medium">
              {trustData?.profile_completed ? '100% Complete' : 'Active'}
            </strong>
            <p className="text-[11px] text-slate-400 font-light">
              {trustData?.verified_properties_count ?? properties.length} Verified Stays Listed
            </p>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed font-light border-t border-white/5 pt-3">
          * Voyara evaluates stay partner and property trust using multiple platform signals (phone verification, email verification, authentic photos, pricing consistency, accurate location, and complete profile). It does not legally certify property ownership.
        </p>
      </div>

      {/* 3. My Properties Portfolio (Left) + Upcoming Arrivals (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: My Properties Portfolio Grid (Col 7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#091B29] dark:text-white">
                My Properties Portfolio
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Accommodations and retreats published on Voyara
              </p>
            </div>
            <Link
              to="/provider/properties"
              className="text-xs font-bold text-[#087F8C] hover:text-orange-500 flex items-center space-x-1 transition-colors"
            >
              <span>View All ({properties.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-14 bg-white dark:bg-[#0F273D] rounded-3xl border border-slate-200/80 dark:border-slate-800 flex justify-center shadow-sm">
              <div className="w-8 h-8 border-3 border-[#087F8C] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : properties.length === 0 ? (
            <div className="bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-3xl bg-[#087F8C]/10 text-[#087F8C] mx-auto flex items-center justify-center">
                <Home className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-serif font-bold text-[#091B29] dark:text-white">
                  Your first property listing starts here
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-light leading-relaxed">
                  List your homestay, villa, or boutique resort to begin receiving verified bookings from mindful travelers.
                </p>
              </div>
              <Link
                to="/provider/properties/new"
                className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-[#EA580C] text-white text-xs font-bold rounded-2xl shadow-lg shadow-orange-500/20 hover:scale-[1.02] transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>List Property Now</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {properties.slice(0, 4).map((prop) => {
                const img =
                  prop.images?.[0]?.image_url ||
                  prop.image_url ||
                  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80';

                return (
                  <Link
                    key={prop.id}
                    to={`/provider/properties`}
                    className="group bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:border-[#087F8C]/40 transition-all flex flex-col hover:-translate-y-1"
                  >
                    <div className="aspect-16/10 relative overflow-hidden bg-slate-100 dark:bg-slate-900">
                      <img
                        src={img}
                        alt={prop.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3.5 right-3.5">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          prop.verification_status === 'VERIFIED'
                            ? 'bg-[#35A66F] text-white shadow-xs'
                            : prop.verification_status === 'REJECTED'
                            ? 'bg-rose-500 text-white shadow-xs'
                            : 'bg-[#F6C945] text-slate-900 shadow-xs'
                        }`}>
                          {prop.verification_status || 'PENDING'}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h4 className="text-base font-serif font-bold text-[#091B29] dark:text-white truncate group-hover:text-[#087F8C] transition-colors">
                          {prop.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center space-x-1.5 mt-1 font-light">
                          <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                          <span>{prop.city || 'Munnar'}, {prop.state || 'Kerala'}</span>
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                          {prop.rooms?.length || 0} Room Types
                        </span>
                        <span className="font-serif font-bold text-[#087F8C] dark:text-[#27B7A8] text-xs">
                          {prop.property_type || 'Homestay'}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Arrivals & Guest Board (Col 5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#091B29] dark:text-white">
                Upcoming Arrivals
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Confirmed guest reservations
              </p>
            </div>
            <Link
              to="/provider/bookings"
              className="text-xs font-bold text-[#087F8C] hover:text-orange-500 flex items-center space-x-1 transition-colors"
            >
              <span>Arrivals Board</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3.5">
            {loading ? (
              <div className="p-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-[#087F8C] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : recentBookings.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-500 mx-auto flex items-center justify-center">
                  <Clock className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-serif font-bold text-[#091B29] dark:text-white">No pending arrivals</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-light">
                    Live guest bookings and check-in schedules will appear here in real time.
                  </p>
                </div>
              </div>
            ) : (
              recentBookings.slice(0, 5).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FFFDF7] dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 hover:border-orange-500/30 transition-all"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-[#EA580C] text-white font-serif font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                      {b.customer_name?.charAt(0) || 'G'}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[#091B29] dark:text-white truncate">
                        {b.customer_name || 'Guest'}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-light">
                        {b.check_in} ➔ {b.check_out}
                      </p>
                      <p className="text-[10px] text-[#087F8C] dark:text-[#27B7A8] truncate font-medium">
                        {b.room_name || 'Sanctuary Suite'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right space-y-1 shrink-0">
                    <span className="font-serif font-bold text-xs text-orange-600 dark:text-orange-400 block">
                      ₹{b.total_amount?.toLocaleString('en-IN')}
                    </span>
                    <StatusBadge status={b.status} size="sm" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 4. Property Availability Calendar */}
      <div className="bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-100 dark:border-slate-800 gap-3">
          <div>
            <h3 className="text-xl font-serif font-bold text-[#091B29] dark:text-white">
              Property Calendar & Blackouts
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live room availability, occupied nights, and blackout schedule
            </p>
          </div>
          <Link
            to="/provider/availability"
            className="text-xs font-bold text-[#087F8C] hover:text-orange-500 inline-flex items-center space-x-1 transition-colors"
          >
            <span>Manage Calendar & Blackouts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <CalendarWidget
          bookedDates={bookedDays}
          blockedDates={[]}
          initialMonth={currentMonthName}
          initialYear={currentYearNum}
        />
      </div>

      {/* 5. Host Concierge / Support Callout */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#091B29] via-[#0F273D] to-[#087F8C] text-white shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6 border border-teal-500/30">
        <div className="flex items-center space-x-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/20 text-[#27B7A8] border border-teal-500/30 flex items-center justify-center shrink-0">
            <Mail className="w-7 h-7" />
          </div>
          <div className="min-w-0 space-y-1">
            <h3 className="text-base font-serif font-bold text-white">
              Stay Partner Onboarding & Property Verification Desk
            </h3>
            <p className="text-xs text-slate-300 font-light">
              Need assistance with room inventory, payouts, or property verification? Direct Concierge: <strong className="text-[#27B7A8] underline font-medium">adminvoyara@gmail.com</strong>
            </p>
          </div>
        </div>

        <Link
          to="/provider/support"
          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-[#EA580C] hover:from-orange-600 hover:to-orange-700 text-white text-xs font-bold rounded-2xl shadow-lg shadow-orange-500/20 transition-all shrink-0 cursor-pointer flex items-center space-x-2"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Stay Partner Support Desk</span>
        </Link>
      </div>
    </div>
  );
};

export default ProviderDashboard;
