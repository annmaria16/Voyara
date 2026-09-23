import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard,
  Home,
  BookOpen,
  Calendar,
  DollarSign,
  Star,
  MessageSquare,
  Settings,
  Compass,
  Map,
  Flame,
  Heart,
  User,
  Users,
  Building2,
  FileText,
  AlertTriangle,
  Activity,
  LogOut,
  ShieldCheck,
  Layers,
  Bed,
  PlusCircle,
  HelpCircle,
  Sun,
  Moon,
} from 'lucide-react';

export const DashboardSidebar = ({ role, isOpen = false, onClose = () => { } }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navConfigs = {
    CUSTOMER: {
      roleBadge: 'TRAVELER',
      activeBg: 'bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] text-white shadow-md shadow-teal-900/20 font-bold',
      items: [
        { name: 'Travel Journal', path: '/customer', icon: LayoutDashboard },
        { name: 'Trip Planner', path: '/traveler/trip-planner', icon: Map, highlight: true },
        { name: 'Explore Stays', path: '/search', icon: Compass },
        { name: 'Experiences', path: '/experiences', icon: Flame },
        { name: 'My Journeys', path: '/customer/bookings', icon: BookOpen },
        { name: 'Messages', path: '/customer/messages', icon: MessageSquare },
        { name: 'Traveler Profile', path: '/customer/profile', icon: User },
        { name: 'Help & Support', path: '/customer/support', icon: HelpCircle },
      ],
    },
    PROVIDER: {
      roleBadge: 'STAY PARTNER',
      activeBg: 'bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] text-white shadow-md shadow-teal-900/20 font-bold',
      items: [
        { name: 'Partner Dashboard', path: '/provider', icon: LayoutDashboard },
        { name: 'My Places', path: '/provider/properties', icon: Home },
        { name: 'Add Property', path: '/provider/properties/new', icon: PlusCircle, highlight: true },
        { name: 'Manage Rooms', path: '/provider/rooms', icon: Bed },
        { name: 'Manage Availability', path: '/provider/availability', icon: Calendar },
        { name: 'Experiences', path: '/provider/experiences', icon: Flame },
        { name: 'Guest Reservations', path: '/provider/bookings', icon: BookOpen },
        { name: 'Messages', path: '/provider/messages', icon: MessageSquare },
        { name: 'Guest Reviews', path: '/provider/reviews', icon: Star },
        { name: 'Stay Partner Profile', path: '/provider/profile', icon: User },
        { name: 'Support Desk', path: '/provider/support', icon: HelpCircle },
      ],
    },
    ADMIN: {
      roleBadge: 'VOYARA CONTROL CENTER',
      activeBg: 'bg-gradient-to-r from-[#087F8C] to-[#17324D] text-white shadow-md shadow-teal-900/20 font-bold',
      items: [
        { name: 'Control Center', path: '/admin', icon: LayoutDashboard },
        { name: 'Property Review Desk', path: '/admin/properties', icon: Home, highlight: true },
        { name: 'VeriNova Command', path: '/admin/verification', icon: ShieldCheck, highlight: true },
        { name: 'Bookings Monitor', path: '/admin/bookings', icon: BookOpen },
        { name: 'User Directory', path: '/admin/users', icon: Users },
        { name: 'Support Desk', path: '/admin/support', icon: MessageSquare },
        { name: 'Control Center Profile', path: '/admin/profile', icon: User },
      ],
    },
  };

  const normalizedRole = (role || user?.role || 'CUSTOMER').toUpperCase();
  const config = navConfigs[normalizedRole] || navConfigs.CUSTOMER;

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-[#FFFDF7] dark:bg-[#091B29] text-[#17324D] dark:text-slate-200 border-r border-[#E0ECEF] dark:border-white/10 w-64 select-none shadow-xs dark:shadow-none transition-colors duration-200">
      {/* Top Brand Logo & Role Badge */}
      <div className="p-5 pb-4 space-y-3 border-b border-[#E0ECEF] dark:border-white/10">
        <Link to="/" className="flex items-center space-x-2.5 group">
          <img
            src="/logo.png"
            alt="VOYARA"
            className="h-10 w-auto object-contain rounded-xl transition-transform duration-300 group-hover:scale-105"
          />
        </Link>

        {/* Role Badge Pill */}
        <div className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] text-white text-[10px] font-black tracking-widest text-center uppercase shadow-sm">
          {config.roleBadge}
        </div>
      </div>

      {/* Navigation items */}
      <div className="flex-1 py-3 px-2.5 space-y-1.5 overflow-y-auto custom-scrollbar">
        {config.items.map((item) => {
          const Icon = item.icon;
          const isExact = location.pathname === item.path;
          const isSubpath =
            item.path !== '/' &&
            item.path !== '/customer' &&
            item.path !== '/provider' &&
            item.path !== '/admin' &&
            location.pathname.startsWith(item.path);

          const isRelatedDiscovery =
            item.path === '/search' &&
            (location.pathname.startsWith('/properties') || location.pathname.startsWith('/booking'));

          const isActive = isExact || isSubpath || isRelatedDiscovery;

          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={onClose}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 ${isActive
                  ? config.activeBg
                  : item.highlight
                    ? 'text-[#087F8C] dark:text-[#27B7A8] hover:text-[#0F9D9A] dark:hover:text-white hover:bg-[#DDF3E7]/60 dark:hover:bg-white/5 font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#17324D] dark:hover:text-white hover:bg-[#EAF3F5]/70 dark:hover:bg-white/5'
                }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${isActive
                    ? 'text-white'
                    : item.highlight
                      ? 'text-[#087F8C] dark:text-[#27B7A8]'
                      : 'text-slate-400 dark:text-slate-400'
                  }`}
              />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Bottom Segment: 2-Theme Switcher & User Profile */}
      <div className="p-3 border-t border-[#E0ECEF] dark:border-white/10 bg-[#F4F9FA]/80 dark:bg-[#0B1E2E]/90 space-y-2.5">
        {/* 2-Option Theme Switcher */}
        <div className="bg-white/90 dark:bg-white/5 border border-[#E0ECEF] dark:border-white/10 p-1 rounded-xl flex items-center justify-between text-[11px] font-bold gap-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${theme === 'light'
                ? 'bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] text-white shadow-xs font-black'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            title="Switch to Light Theme"
          >
            <Sun className="w-3.5 h-3.5" />
            <span className="text-[11px]">Light</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${theme === 'dark'
                ? 'bg-gradient-to-r from-[#087F8C] to-[#17324D] text-white shadow-xs font-black'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            title="Switch to Dark Theme"
          >
            <Moon className="w-3.5 h-3.5" />
            <span className="text-[11px]">Dark</span>
          </button>
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between p-2 rounded-2xl bg-white dark:bg-white/5 border border-[#E0ECEF] dark:border-white/10 shadow-2xs">
          <div className="flex items-center space-x-2.5 min-w-0">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url.startsWith('http') ? user.avatar_url : `http://localhost:8000${user.avatar_url}`}
                alt={user?.name || 'User'}
                className="w-8 h-8 rounded-xl object-cover shadow-xs border border-[#087F8C]/40 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#087F8C] to-[#0F9D9A] flex items-center justify-center text-white font-bold text-xs uppercase shrink-0 shadow-xs">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#17324D] dark:text-white truncate font-sans">
                {user?.name || 'Voyara User'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate capitalize font-medium">
                {user?.email || config.roleBadge}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-slate-400 dark:text-slate-300 hover:text-[#F97316] hover:bg-orange-500/10 transition-colors shrink-0 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Fixed Sidebar */}
      <div className="hidden lg:block w-64 shrink-0">
        <aside className="fixed top-0 left-0 w-64 h-screen z-30">
          {sidebarContent}
        </aside>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#091B29]">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

