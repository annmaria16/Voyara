import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { providerApi } from '../../api/provider';
import { StatCard } from '../../components/dashboard/StatCard';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { CalendarWidget } from '../../components/dashboard/CalendarWidget';
import {
  BookOpen,
  DollarSign,
  Star,
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
  MessageSquare
} from 'lucide-react';


export const ProviderDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, propsRes] = await Promise.all([
          providerApi.getDashboard().catch(() => null),
          providerApi.getProperties().catch(() => []),
        ]);
        setDashboardData(dashRes);
        setProperties(Array.isArray(propsRes) ? propsRes : []);
      } catch (err) {
        console.error('Error fetching provider dashboard data:', err);
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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 1. Provider Greeting & Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Verified Host Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-serif text-[#102A43] dark:text-white tracking-tight">
            Welcome back, {dashboardData?.provider?.business_name || user?.name || 'Host'}! ☀️
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
            Manage your properties, real-time inventory, and verified reservations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/provider/properties/new"
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-orange-500/20 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Property</span>
          </Link>
          <Link
            to="/provider/bookings"
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl shadow-2xs hover:bg-emerald-50 dark:hover:bg-slate-800/80 hover:border-emerald-500/30 transition-all cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Manage Bookings</span>
          </Link>
        </div>
      </div>

      {/* 2. Four Solid Real Stat Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Properties"
          value={String(totalPropsCount).padStart(2, '0')}
          change={`${stats.active_properties ?? totalPropsCount} Active`}
          changeType="increase"
          icon={Home}
          accentColor="emerald"
          variant="pastel"
        />
        <StatCard
          title="Total Bookings"
          value={String(totalBookingsCount)}
          change={`${confirmedBookingsCount} Verified / Confirmed`}
          changeType="increase"
          icon={BookOpen}
          accentColor="blue"
          variant="pastel"
        />
        <StatCard
          title="Gross Revenue"
          value={`₹${totalRevenueAmount.toLocaleString('en-IN')}`}
          change="Real-time Verified Total"
          changeType="increase"
          icon={DollarSign}
          accentColor="orange"
          variant="pastel"
        />
        <StatCard
          title="Bookable Units"
          value={String(totalRoomsCount)}
          change={`${stats.total_experiences ?? 0} Experiences Hosted`}
          changeType="neutral"
          icon={Layers}
          accentColor="coral"
          variant="pastel"
        />
      </div>

      {/* 3. Your Properties (Left) + Recent Bookings (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 cols): Your Properties */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold font-serif text-slate-900 dark:text-white">
              Your Properties
            </h2>
            <Link
              to="/provider/properties"
              className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center space-x-0.5"
            >
              <span>View All ({properties.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-8 bg-white dark:bg-[#131D2E] rounded-2xl border border-slate-200/80 dark:border-slate-800 flex justify-center">
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : properties.length === 0 ? (
            <div className="bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 mx-auto flex items-center justify-center">
                <Home className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  No properties added yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Add your first property to configure room inventory, capacity, and live booking rates.
                </p>
              </div>
              <Link
                to="/provider/properties/new"
                className="inline-block px-4 py-2 bg-gradient-to-r from-[#F97360] to-orange-500 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                Add First Property
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {properties.slice(0, 3).map((prop) => {
                const img =
                  prop.images?.[0]?.image_url ||
                  prop.image_url ||
                  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80';

                return (
                  <Link
                    key={prop.id}
                    to={`/provider/properties`}
                    className="bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md hover:border-orange-500/30 transition-all group"
                  >
                    <div className="aspect-4/3 overflow-hidden">
                      <img
                        src={img}
                        alt={prop.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-3 space-y-1">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate font-sans group-hover:text-orange-500 transition-colors">
                        {prop.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {prop.city || 'Munnar'}, {prop.state || 'Kerala'}
                      </p>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">
                          {prop.rooms?.length || 0} Units
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[10px] uppercase">
                          {prop.is_active ? 'Active' : 'Draft'}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right (5 cols): Recent Bookings from Database */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold font-serif text-slate-900 dark:text-white">
              Recent Bookings
            </h2>
            <Link
              to="/provider/bookings"
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-0.5"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
            {loading ? (
              <div className="p-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : recentBookings.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">No recent reservations</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  When guests book your properties, live verified bookings will appear here.
                </p>
              </div>
            ) : (
              recentBookings.slice(0, 4).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold text-xs flex items-center justify-center shrink-0">
                      {b.customer_name?.charAt(0) || 'G'}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {b.customer_name || 'Guest'}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {b.check_in} — {b.check_out} • {b.room_name || 'Room'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-0.5 shrink-0">
                    <span className="font-bold text-xs text-[#F97360] font-serif block">
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

      {/* 4. Availability Overview Section (Real Database Calendar) */}
      <div className="bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-2xs">
        <CalendarWidget
          bookedDates={bookedDays}
          blockedDates={[]}
          initialMonth={currentMonthName}
          initialYear={currentYearNum}
        />
      </div>

      {/* 5. Host Dedicated Help & Support Callout */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#131D2E] border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Host Onboarding, Listing or Verification Support
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Help & Support: <strong className="text-emerald-600 dark:text-emerald-400">adminvoyara@gmail.com</strong> • Dedicated Host Concierge
            </p>
          </div>
        </div>

        <Link
          to="/provider/support"
          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all shrink-0 cursor-pointer flex items-center space-x-1.5"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Host Support Desk</span>
        </Link>
      </div>
    </div>
  );
};

export default ProviderDashboard;

