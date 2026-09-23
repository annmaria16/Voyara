import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { AreaLineChart, BarChart, DonutChart } from '../../components/dashboard/DashboardCharts';
import {
  Users,
  Building2,
  BookOpen,
  Home,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  Activity,
  Calendar,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  FileText,
  MapPin,
  Sparkles,
  Zap,
  DollarSign,
  Award,
  Clock,
} from 'lucide-react';

export const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [verificationRecords, setVerificationRecords] = useState([]);
  const [reviewProperties, setReviewProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, verifRes, propsRes] = await Promise.all([
          adminApi.getDashboard().catch(() => null),
          adminApi.getVerificationRecords().catch(() => []),
          adminApi.getProperties().catch(() => []),
        ]);
        setDashboardData(dashRes);
        setVerificationRecords(Array.isArray(verifRes) ? verifRes : []);
        setReviewProperties(Array.isArray(propsRes) ? propsRes.slice(0, 4) : []);
      } catch (err) {
        console.error('Error loading admin dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = dashboardData?.stats || {};

  const totalUsersCount =
    stats.total_users ?? ((stats.total_customers || 0) + (stats.total_providers || 0));
  const totalProvidersCount = stats.total_providers ?? 0;
  const totalPropsCount = stats.total_properties ?? 0;
  const totalBookingsCount = stats.total_bookings ?? 0;
  const totalRevenueAmount = stats.total_revenue ?? 0;

  const bookingsChartData = dashboardData?.bookings_chart || [
    { label: 'Today', value: totalBookingsCount },
  ];

  const revenueChartData = dashboardData?.revenue_chart || [
    { label: 'Today', value: totalRevenueAmount },
  ];

  const topLocationsData = dashboardData?.top_locations || [
    { label: 'Active Sanctuaries', percentage: 100, color: '#147D92' },
  ];

  return (
    <div className="space-y-10">
      {/* 1. Header: Voyara Control Center */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#091B29] dark:text-white tracking-tight">
            Voyara Control Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-light">
            Manage the platform, properties, bookings, and verification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/verification"
            className="inline-flex items-center space-x-2 px-6 py-3.5 bg-gradient-to-r from-[#091B29] to-[#087F8C] hover:from-[#0F273D] hover:to-[#0F9D9A] text-white text-xs font-bold rounded-2xl shadow-xl transition-all cursor-pointer border border-teal-500/30"
          >
            <ShieldCheck className="w-4 h-4 text-[#27B7A8]" />
            <span>VeriNova Command</span>
          </Link>
          <Link
            to="/admin/properties"
            className="inline-flex items-center space-x-2 px-6 py-3.5 bg-gradient-to-r from-orange-500 to-[#EA580C] hover:from-orange-600 hover:to-orange-700 text-white text-xs font-bold rounded-2xl shadow-xl shadow-orange-500/25 hover:scale-[1.02] transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Review Desk</span>
          </Link>
        </div>
      </div>

      {/* 2. Four Platform Ecosystem Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Gross Platform Value */}
        <div className="p-6 bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Gross Platform Value
            </span>
            <p className="text-2xl sm:text-3xl font-serif font-black text-orange-600 dark:text-orange-400">
              ₹{totalRevenueAmount.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-[#087F8C] dark:text-[#27B7A8] font-medium">
              Verified settlements
            </p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 shadow-xs">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Total Reservations */}
        <div className="p-6 bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Reservations
            </span>
            <p className="text-2xl sm:text-3xl font-serif font-black text-[#091B29] dark:text-white">
              {totalBookingsCount}
            </p>
            <p className="text-[11px] text-[#35A66F] font-medium">
              {stats.verified_bookings || totalBookingsCount} VeriNova Audited
            </p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-emerald-500/10 text-[#35A66F] flex items-center justify-center shrink-0 shadow-xs">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        {/* Active Properties */}
        <div className="p-6 bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Active Properties
            </span>
            <p className="text-2xl sm:text-3xl font-serif font-black text-[#091B29] dark:text-white">
              {totalPropsCount}
            </p>
            <p className="text-[11px] text-[#087F8C] dark:text-[#27B7A8] font-medium">
              {stats.active_properties || totalPropsCount} Verified & Bookable
            </p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-[#087F8C]/10 text-[#087F8C] dark:text-[#27B7A8] flex items-center justify-center shrink-0 shadow-xs">
            <Home className="w-6 h-6" />
          </div>
        </div>

        {/* Registered Users */}
        <div className="p-6 bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Platform Community
            </span>
            <p className="text-2xl sm:text-3xl font-serif font-black text-[#091B29] dark:text-white">
              {totalUsersCount}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {stats.total_customers || 0} Travelers • {totalProvidersCount} Stay Partners
            </p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-[#F6C945]/15 text-[#D97706] dark:text-[#F6C945] flex items-center justify-center shrink-0 shadow-xs">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Property Review & Approval Desk Queue (with High-Res Visual Cards) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#091B29] dark:text-white">
              Property Review & Approval Desk
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Stay Partner submissions pending 9-signal multi-factor verification
            </p>
          </div>
          <Link
            to="/admin/properties"
            className="text-xs font-bold text-[#087F8C] hover:text-orange-500 flex items-center space-x-1 transition-colors"
          >
            <span>Review Desk Queue ({stats.pending_properties ?? 0})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-14 bg-white dark:bg-[#0F273D] rounded-3xl border border-slate-200/80 dark:border-slate-800 flex justify-center shadow-sm">
            <div className="w-8 h-8 border-3 border-[#087F8C] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : reviewProperties.length === 0 ? (
          <div className="bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-10 text-center space-y-3 shadow-sm">
            <CheckCircle2 className="w-12 h-12 text-[#35A66F] mx-auto" />
            <h3 className="text-lg font-serif font-bold text-[#091B29] dark:text-white">
              All property submissions reviewed
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-light">
              No pending host submissions requiring manual verification at this moment.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {reviewProperties.map((prop) => {
              const img =
                prop.images?.[0]?.image_url ||
                prop.image_url ||
                'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80';

              return (
                <div
                  key={prop.id}
                  className="bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all flex flex-col justify-between hover:-translate-y-1"
                >
                  <div className="aspect-16/10 relative overflow-hidden bg-slate-100 dark:bg-slate-900">
                    <img
                      src={img}
                      alt={prop.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-full bg-[#091B29]/75 backdrop-blur-md text-white text-[10px] font-bold">
                        {prop.property_type || 'Homestay'}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${prop.verification_status === 'VERIFIED'
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
                      <h4 className="text-base font-serif font-bold text-[#091B29] dark:text-white truncate">
                        {prop.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center space-x-1.5 mt-1 font-light">
                        <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span>{prop.city || 'Munnar'}, {prop.state || 'Kerala'}</span>
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        ID: #{prop.id}
                      </span>
                      <Link
                        to="/admin/properties"
                        className="px-3.5 py-1.5 bg-gradient-to-r from-orange-500 to-[#EA580C] text-white text-xs font-bold rounded-xl shadow-xs hover:scale-[1.02] transition-all"
                      >
                        Review Dossier
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Visual Charts Row: Bookings Activity + Revenue Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookings Overview Chart */}
        <div className="bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-serif font-bold text-[#091B29] dark:text-white">
                Booking Volume Telemetry
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-light">
                {totalBookingsCount} Total Completed Reservations in DB
              </p>
            </div>
            <Link
              to="/admin/bookings"
              className="text-xs font-bold text-[#087F8C] hover:text-orange-500 flex items-center space-x-1 transition-colors"
            >
              <span>Booking Monitor</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <AreaLineChart
            data={bookingsChartData}
            height={160}
            color="gold"
            valuePrefix=""
            valueSuffix=" Bookings"
          />
        </div>

        {/* Revenue Overview Chart */}
        <div className="bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-serif font-bold text-[#091B29] dark:text-white">
                Gross Platform Revenue
              </h3>
              <p className="text-xs font-bold text-orange-600 dark:text-orange-400">
                ₹{totalRevenueAmount.toLocaleString('en-IN')}{' '}
                <span className="text-[11px] text-[#087F8C] dark:text-[#27B7A8] font-normal">
                  (Verified Booking Value)
                </span>
              </p>
            </div>
            <Link
              to="/admin/bookings"
              className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center space-x-1 transition-colors"
            >
              <span>Financial Ledger</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <BarChart
            data={revenueChartData}
            height={160}
            barColor="sunset"
            valuePrefix="₹"
          />
        </div>
      </div>

      {/* 5. Bottom Row: VeriNova Audit Stream + Regional Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (7 cols): VeriNova Audit Stream */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-serif font-bold text-[#091B29] dark:text-white">
                VeriNova™ Audit Stream
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Transaction integrity logs and consistency assessments
              </p>
            </div>
            <Link
              to="/admin/verification"
              className="text-xs font-bold text-[#087F8C] hover:text-orange-500 flex items-center space-x-1 transition-colors"
            >
              <span>Command Center ({verificationRecords.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3.5">
            {loading ? (
              <div className="p-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-[#087F8C] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : verificationRecords.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <ShieldCheck className="w-10 h-10 text-slate-400 mx-auto" />
                <h4 className="text-sm font-serif font-bold text-[#091B29] dark:text-white">No audit records yet</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-light">
                  When customer bookings undergo VeriNova consistency checks, audit logs will appear here.
                </p>
              </div>
            ) : (
              verificationRecords.slice(0, 4).map((v) => (
                <div
                  key={v.booking_id || v.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-[#FFFDF7] dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 hover:border-teal-500/40 transition-all"
                >
                  <div className="flex items-center space-x-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#087F8C]/10 text-[#087F8C] dark:text-[#27B7A8] flex items-center justify-center shrink-0 shadow-xs">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-mono font-bold text-[#091B29] dark:text-white">
                        {v.booking_number ? `Booking #${v.booking_number}` : `Reservation #${v.booking_id}`}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-light">
                        {v.property_name || 'Property'} • {v.room_name || 'Stay'} (₹{v.total_amount?.toLocaleString('en-IN')})
                      </p>
                    </div>
                  </div>

                  <div>
                    <StatusBadge status={v.verification_status || 'VERIFIED'} size="sm" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Destination Distribution */}
        <div className="lg:col-span-5 space-y-4">
          <div>
            <h2 className="text-xl font-serif font-bold text-[#091B29] dark:text-white">
              Property Distribution
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Active destinations across India
            </p>
          </div>

          <div className="bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
            <DonutChart
              segments={topLocationsData}
              size={140}
              centerLabel="Active Stays"
              centerValue={String(totalPropsCount)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
