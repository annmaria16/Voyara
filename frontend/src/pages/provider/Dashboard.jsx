import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { providerApi } from '../../api/provider';
import { CalendarWidget } from '../../components/dashboard/CalendarWidget';
import {
  BookOpen,
  DollarSign,
  PlusCircle,
  ArrowRight,
  Sparkles,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Mail,
  MessageSquare,
  TrendingUp,
  Clock,
  Star,
  UserCheck,
} from 'lucide-react';

export const ProviderDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [properties, setProperties] = useState([]);
  const [trustData, setTrustData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [calendarData, setCalendarData] = useState(null);
  const [calendarPropertyId, setCalendarPropertyId] = useState(null);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const now = new Date();
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(now.toLocaleString('default', { month: 'long' }));
  const [calendarMonthNum, setCalendarMonthNum] = useState(now.getMonth() + 1);

  const fetchCalendar = async (propId, year, monthNum) => {
    if (!propId) return;
    setCalendarLoading(true);
    try {
      const data = await providerApi.getPropertyCalendar(propId, {
        year: year || calendarYear,
        month: monthNum || calendarMonthNum,
      });
      setCalendarData(data);
    } catch (err) {
      console.error('Error fetching dashboard calendar:', err);
    } finally {
      setCalendarLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, propsRes, trustRes] = await Promise.all([
          providerApi.getDashboard().catch(() => null),
          providerApi.getProperties().catch(() => []),
          providerApi.getTrust().catch(() => null),
        ]);
        setDashboardData(dashRes);
        const propsList = Array.isArray(propsRes) ? propsRes : [];
        setProperties(propsList);
        setTrustData(trustRes);

        // Default immediately to the first specific property
        if (propsList.length > 0) {
          const firstPropId = propsList[0].id;
          setCalendarPropertyId(firstPropId);
          fetchCalendar(firstPropId, now.getFullYear(), now.getMonth() + 1);
        }
      } catch (err) {
        console.error('Error fetching host dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handlePropertyCalendarChange = (propId) => {
    setCalendarPropertyId(propId);
    fetchCalendar(propId, calendarYear, calendarMonthNum);
  };

  const handleMonthChange = (newMonth, newYear, newMonthIdx) => {
    setCalendarMonth(newMonth);
    setCalendarYear(newYear);
    setCalendarMonthNum(newMonthIdx);
    if (calendarPropertyId) {
      fetchCalendar(calendarPropertyId, newYear, newMonthIdx);
    }
  };

  const stats = dashboardData?.stats || {};
  const recentBookings = dashboardData?.recent_bookings || [];

  const totalPropsCount = stats.total_properties ?? properties.length ?? 0;
  const totalBookingsCount = stats.total_bookings ?? 0;
  const confirmedBookingsCount = stats.confirmed_bookings ?? 0;
  const totalRevenueAmount = stats.total_revenue ?? 0;

  // Primary / Featured Property Image
  const featuredProperty = properties[0];
  const featuredImg =
    featuredProperty?.images?.[0]?.image_url ||
    featuredProperty?.image_url ||
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1600&q=85';

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
            <h1 className="text-3xl sm:text-5xl font-serif text-white tracking-tight leading-tight">
              Partner Dashboard
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

      {/* 2. Operational & Financial Metric Pedestals (4 Blocks) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Finalized Earnings */}
        <div data-testid="provider-finalized-earnings" className="p-6 bg-white dark:bg-[#0F273D] border border-emerald-500/30 dark:border-emerald-500/20 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Finalized Partner Earnings
            </span>
            <p className="text-2xl sm:text-3xl font-serif font-black text-emerald-600 dark:text-emerald-400">
              ₹{(stats.finalized_earnings || 0).toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Checked-in & reconciled stays (90%)
            </p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Settlements */}
        <div data-testid="provider-pending-settlements" className="p-6 bg-white dark:bg-[#0F273D] border border-amber-500/30 dark:border-amber-500/20 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Pending Settlements
            </span>
            <p className="text-2xl sm:text-3xl font-serif font-black text-amber-600 dark:text-amber-400">
              ₹{(stats.pending_settlements || 0).toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Awaiting guest arrival & check-in
            </p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Gross Booking Volume */}
        <div data-testid="provider-gross-volume" className="p-6 bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Gross Platform Volume
            </span>
            <p className="text-2xl sm:text-3xl font-serif font-black text-orange-600 dark:text-orange-400">
              ₹{totalRevenueAmount.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-[#087F8C] dark:text-[#27B7A8] font-medium">
              Voyara share (10%): ₹{(stats.finalized_commission || 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 shadow-xs">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Reservations Summary */}
        <div data-testid="provider-reservations-summary" className="p-6 bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Reservations
            </span>
            <p className="text-2xl sm:text-3xl font-serif font-black text-[#091B29] dark:text-white">
              {String(totalBookingsCount).padStart(2, '0')} <span className="text-xs font-sans font-normal text-slate-500">Total</span>
            </p>
            <p className="text-[11px] text-[#35A66F] font-medium">
              ✓ {confirmedBookingsCount} Upcoming • {stats.checked_in_bookings || 0} In-House
            </p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-[#087F8C]/10 text-[#087F8C] dark:text-[#27B7A8] flex items-center justify-center shrink-0 shadow-xs">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Property Availability Calendar & Blackouts (Directly Under 4 Blocks) */}
      <div className="bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
          <div>
            <h3 className="text-xl font-serif font-bold text-[#091B29] dark:text-white flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-[#087F8C]" />
              <span>Property Calendar & Blackouts</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-light">
              Live room availability, occupied nights, and blackout schedule across your stays
            </p>
          </div>
          <Link
            to="/provider/availability"
            className="text-xs font-bold text-[#087F8C] hover:text-orange-500 inline-flex items-center space-x-1.5 transition-colors"
          >
            <span>Manage Calendar & Blackouts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Property Selector for Specific Property Calendar */}
        {properties.length > 1 && (
          <div className="flex items-center space-x-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0">
              Select Property:
            </span>
            {properties.map((p) => (
              <button
                key={`dash-cal-prop-${p.id}`}
                type="button"
                onClick={() => handlePropertyCalendarChange(p.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${calendarPropertyId === p.id
                    ? 'bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] text-white shadow-xs font-serif'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        <CalendarWidget
          propertyName={
            properties.find((p) => p.id === calendarPropertyId)?.name || 'Property Calendar'
          }
          propertyId={calendarPropertyId}
          calendarData={calendarData}
          loading={calendarLoading}
          initialMonth={calendarMonth}
          initialYear={calendarYear}
          onMonthChange={handleMonthChange}
        />
      </div>

      {/* Guest Reviews & Feedback Summary */}
      <div className="bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
          <div>
            <h3 className="text-xl font-serif font-bold text-[#091B29] dark:text-white flex items-center space-x-2">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span>Guest Reviews & Ratings</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-light">
              Authentic feedback submitted by travelers following completed checkout stays
            </p>
          </div>
          <Link
            to="/provider/reviews"
            className="text-xs font-bold text-[#087F8C] hover:text-orange-500 inline-flex items-center space-x-1.5 transition-colors"
          >
            <span>View All Reviews ({stats.total_reviews || 0})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Average Rating Block */}
          <div className="p-5 rounded-2xl bg-[#FFF8F0]/70 dark:bg-slate-900/60 border border-orange-200/60 dark:border-teal-900/40 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Overall Rating</span>
              <strong className="text-2xl sm:text-3xl font-serif font-black text-[#17324D] dark:text-white block mt-0.5">
                {stats.total_reviews > 0 ? `${Number(stats.average_rating || 0).toFixed(1)} / 5` : '—'}
              </strong>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                {stats.total_reviews > 0 ? `${stats.total_reviews} verified review(s)` : 'No reviews yet'}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Star className="w-6 h-6 fill-amber-400" />
            </div>
          </div>

          {/* Cleanliness & Staff */}
          <div className="p-5 rounded-2xl bg-[#FFFDF7] dark:bg-slate-900/60 border border-slate-100 dark:border-teal-900/40 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Hospitality Metrics</span>
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Cleanliness</span>
              <strong className="text-[#087F8C] dark:text-[#27B7A8]">
                {stats.total_reviews > 0 ? `${Number(stats.rating_breakdown?.cleanliness || stats.average_rating || 0).toFixed(1)}/5` : '—'}
              </strong>
            </div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Staff & Care</span>
              <strong className="text-[#087F8C] dark:text-[#27B7A8]">
                {stats.total_reviews > 0 ? `${Number(stats.rating_breakdown?.staff || stats.average_rating || 0).toFixed(1)}/5` : '—'}
              </strong>
            </div>
          </div>

          {/* Location & Value */}
          <div className="p-5 rounded-2xl bg-[#FFFDF7] dark:bg-slate-900/60 border border-slate-100 dark:border-teal-900/40 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Location & Value</span>
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Location</span>
              <strong className="text-[#087F8C] dark:text-[#27B7A8]">
                {stats.total_reviews > 0 ? `${Number(stats.rating_breakdown?.location || stats.average_rating || 0).toFixed(1)}/5` : '—'}
              </strong>
            </div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Value for Money</span>
              <strong className="text-[#087F8C] dark:text-[#27B7A8]">
                {stats.total_reviews > 0 ? `${Number(stats.rating_breakdown?.value || stats.average_rating || 0).toFixed(1)}/5` : '—'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* 4. YOUR VOYARA TRUST SECTION */}
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
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
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
              <UserCheck className="w-4 h-4 text-[#F6C945]" />
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
