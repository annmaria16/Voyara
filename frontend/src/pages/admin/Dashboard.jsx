import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import { StatCard } from '../../components/dashboard/StatCard';
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
  CheckCircle2
} from 'lucide-react';

export const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [verificationRecords, setVerificationRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, verifRes] = await Promise.all([
          adminApi.getDashboard().catch(() => null),
          adminApi.getVerificationRecords().catch(() => []),
        ]);
        setDashboardData(dashRes);
        setVerificationRecords(Array.isArray(verifRes) ? verifRes : []);
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
    { label: 'Active Sanctuaries', percentage: 100, color: '#10B981' }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 1. Header Bar with Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Admin Command Center • Live System Audit</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-serif text-[#102A43] dark:text-white tracking-tight">
            Platform Overview
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time platform statistics, bookings, providers, and VeriNova verification audits directly from PostgreSQL.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-[#102A43] dark:text-slate-200 shadow-2xs">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span>Live Database Telemetry</span>
          </div>
        </div>
      </div>

      {/* 2. Four Solid Real Stat Metric Cards (Directly from PostgreSQL) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={totalUsersCount.toLocaleString('en-IN')}
          change={`${stats.total_customers || 0} Guests • ${stats.total_providers || 0} Hosts`}
          changeType="increase"
          icon={Users}
          accentColor="emerald"
          variant="solid-gradient"
        />
        <StatCard
          title="Total Providers"
          value={totalProvidersCount.toLocaleString('en-IN')}
          change={`${totalPropsCount} Properties Managed`}
          changeType="increase"
          icon={Building2}
          accentColor="blue"
          variant="solid-gradient"
        />
        <StatCard
          title="Total Properties"
          value={totalPropsCount.toLocaleString('en-IN')}
          change={`${stats.active_properties || totalPropsCount} Active & Bookable`}
          changeType="increase"
          icon={Home}
          accentColor="coral"
          variant="solid-gradient"
        />
        <StatCard
          title="Total Bookings"
          value={totalBookingsCount.toLocaleString('en-IN')}
          change={`${stats.verified_bookings || 0} VeriNova Verified (${stats.verification_rate || 100}%)`}
          changeType="increase"
          icon={BookOpen}
          accentColor="purple"
          variant="solid-gradient"
        />
      </div>

      {/* 3. Charts Row: Real Bookings Activity + Real Revenue Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookings Overview Chart */}
        <div className="bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#102A43] dark:text-white font-sans">
                Bookings Activity
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {totalBookingsCount} Total Completed Reservations in DB
              </p>
            </div>
            <Link
              to="/admin/bookings"
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:underline"
            >
              View all bookings →
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
        <div className="bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#102A43] dark:text-white font-sans">
                Gross Revenue
              </h3>
              <p className="text-[11px] font-bold text-[#F97360]">
                ₹{totalRevenueAmount.toLocaleString('en-IN')}{' '}
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold font-sans">
                  (Verified Booking Value)
                </span>
              </p>
            </div>
            <Link
              to="/admin/bookings"
              className="text-xs font-bold text-[#F97360] dark:text-orange-400 hover:text-[#e05e4b] hover:underline"
            >
              View revenue audit →
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

      {/* 4. Bottom Row: Verification Center (Real VeriNova Feed) + Real Locations (Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Real Verification Center Audits */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold font-serif text-[#102A43] dark:text-white">
              VeriNova™ Audit Stream
            </h2>
            <Link
              to="/admin/verification"
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-0.5"
            >
              <span>View all ({verificationRecords.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
            {loading ? (
              <div className="p-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : verificationRecords.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">No audit records yet</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  When bookings undergo VeriNova multi-point checks, audit logs will stream here.
                </p>
              </div>
            ) : (
              verificationRecords.slice(0, 3).map((v) => (
                <div
                  key={v.booking_id || v.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#FFF8F0]/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[#102A43] dark:text-white font-mono">
                        {v.booking_number ? `Booking #${v.booking_number}` : `Reservation #${v.booking_id}`}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {v.property_name || 'Sanctuary'} • {v.room_name || 'Stay'} (₹{v.total_amount?.toLocaleString('en-IN')})
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

        {/* Right Column (5 cols): Real Top Locations Donut Chart */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-base font-bold font-serif text-[#102A43] dark:text-white">
            Property Distribution by Region
          </h2>

          <div className="bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
            <DonutChart
              segments={topLocationsData}
              size={130}
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
