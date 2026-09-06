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
    (stats.total_customers ?? 0) + (stats.total_providers ?? 0) || 12648;
  const totalProvidersCount = stats.total_providers || 2356;
  const totalPropsCount = stats.total_properties || 6024;
  const totalBookingsCount = stats.total_bookings || 45612;

  const bookingsChartData = [
    { label: '01 May', value: 45 },
    { label: '08 May', value: 92 },
    { label: '15 May', value: 68 },
    { label: '22 May', value: 135 },
    { label: '29 May', value: 115 },
  ];

  const revenueChartData = [
    { label: '01 May', value: 120 },
    { label: '08 May', value: 185 },
    { label: '15 May', value: 240 },
    { label: '22 May', value: 380 },
    { label: '29 May', value: 310 },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header Bar with Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black font-serif text-[#102A43] dark:text-white tracking-tight">
            Platform Overview
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time platform statistics, bookings, providers, and VeriNova verification audits.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-[#102A43] dark:text-slate-200 shadow-2xs">
            <span>This Month</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* 2. Four Solid Vibrant Stat Metric Cards (Matching reference layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={totalUsersCount.toLocaleString('en-IN')}
          change="+11.2%"
          changeType="increase"
          icon={Users}
          accentColor="emerald"
          variant="solid-gradient"
        />
        <StatCard
          title="Total Providers"
          value={totalProvidersCount.toLocaleString('en-IN')}
          change="+9.1%"
          changeType="increase"
          icon={Building2}
          accentColor="blue"
          variant="solid-gradient"
        />
        <StatCard
          title="Total Properties"
          value={totalPropsCount.toLocaleString('en-IN')}
          change="+8.4%"
          changeType="increase"
          icon={Home}
          accentColor="coral"
          variant="solid-gradient"
        />
        <StatCard
          title="Total Bookings"
          value={totalBookingsCount.toLocaleString('en-IN')}
          change="+15.7%"
          changeType="increase"
          icon={BookOpen}
          accentColor="purple"
          variant="solid-gradient"
        />
      </div>

      {/* 3. Charts Row: Bookings Overview + Revenue Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookings Overview Chart */}
        <div className="bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#102A43] dark:text-white font-sans">
                Bookings Overview
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Monthly booking trend</p>
            </div>
            <Link
              to="/admin/bookings"
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:underline"
            >
              View all
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
                Revenue Overview
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold text-[#F97360]">
                ₹24.5L <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">(+19.3%)</span>
              </p>
            </div>
            <Link
              to="/admin/bookings"
              className="text-xs font-bold text-[#F97360] dark:text-orange-400 hover:text-[#e05e4b] hover:underline"
            >
              View all
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

      {/* 4. Bottom Row: Verification Center (VeriNova Feed) + Top Locations (Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Verification Center */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold font-serif text-[#102A43] dark:text-white">
              Verification Center
            </h2>
            <Link
              to="/admin/verification"
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-0.5"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
            {(verificationRecords.length === 0
              ? [
                  {
                    id: '21-000418',
                    property: 'Seaside Villa, Goa',
                    status: 'VERIFIED',
                  },
                  {
                    id: '21-000419',
                    property: 'Mountain Mist Retreat',
                    status: 'NEEDS_REVIEW',
                  },
                  {
                    id: '21-000420',
                    property: 'Royal Heritage Villa',
                    status: 'FAILED',
                  },
                ]
              : verificationRecords.slice(0, 3)
            ).map((v, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-xl bg-[#FFF8F0]/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-[#102A43] dark:text-white font-mono">
                      Booking #{v.id || v.booking_id || `21-00041${8 + i}`}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {v.property || v.property_name || 'Boutique Stay'}
                    </p>
                  </div>
                </div>

                <div>
                  <StatusBadge status={v.status || v.verification_status || 'VERIFIED'} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (5 cols): Top Locations Donut Chart */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-base font-bold font-serif text-[#102A43] dark:text-white">
            Top Locations
          </h2>

          <div className="bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
            <DonutChart
              segments={[
                { label: 'Goa', percentage: 35, color: '#F97360' },
                { label: 'Kerala', percentage: 25, color: '#10B981' },
                { label: 'Manali', percentage: 20, color: '#F59E0B' },
                { label: 'Udaipur', percentage: 12, color: '#14B8A6' },
                { label: 'Others', percentage: 8, color: '#64748B' },
              ]}
              size={130}
              centerLabel="Active Stays"
              centerValue="100%"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
