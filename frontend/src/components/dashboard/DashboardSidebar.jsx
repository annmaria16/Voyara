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
  Sparkles,
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
  PlusCircle,
  HelpCircle,
  Sun,
  Moon,
} from 'lucide-react';

export const DashboardSidebar = ({ role, isOpen = false, onClose = () => {} }) => {
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
      roleBadge: 'TRAVELLER',
      activeColor: 'text-[#F97360]',
      activeBg: 'bg-gradient-to-r from-[#F97360]/20 to-emerald-500/10 text-white border-l-4 border-[#F97360] shadow-xs',
      items: [
        { name: 'Dashboard', path: '/customer', icon: LayoutDashboard },
        { name: 'Explore Stays', path: '/search', icon: Compass },
        { name: 'Experiences', path: '/experiences', icon: Flame },
        { name: 'My Bookings', path: '/customer/bookings', icon: BookOpen },
        { name: 'My Profile', path: '/customer/profile', icon: User },
        { name: 'Help & Support', path: '/customer/support', icon: HelpCircle },
      ],
    },
    PROVIDER: {
      roleBadge: 'HOST / PROVIDER',
      activeColor: 'text-emerald-400',
      activeBg: 'bg-gradient-to-r from-emerald-500/20 to-[#F97360]/10 text-white border-l-4 border-emerald-400 shadow-xs',
      items: [
        { name: 'Dashboard', path: '/provider', icon: LayoutDashboard },
        { name: 'Properties', path: '/provider/properties', icon: Home },
        { name: 'Add Property', path: '/provider/properties/new', icon: PlusCircle },
        { name: 'Rooms & Units', path: '/provider/rooms', icon: Layers },
        { name: 'Availability', path: '/provider/availability', icon: Calendar },
        { name: 'Experiences', path: '/provider/experiences', icon: Flame },
        { name: 'Bookings & Guests', path: '/provider/bookings', icon: BookOpen },
        { name: 'Host Profile', path: '/provider/profile', icon: User },
        { name: 'Support Desk', path: '/provider/support', icon: MessageSquare },
      ],
    },
    ADMIN: {
      roleBadge: 'SUPER ADMIN',
      activeColor: 'text-[#F97360]',
      activeBg: 'bg-gradient-to-r from-[#F97360]/20 to-emerald-500/10 text-white border-l-4 border-[#F97360] shadow-xs',
      items: [
        { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
        { name: 'Users & Accounts', path: '/admin/users', icon: Users },
        { name: 'Properties', path: '/admin/properties', icon: Home },
        { name: 'Bookings Monitor', path: '/admin/bookings', icon: BookOpen },
        { name: 'VeriNova Center', path: '/admin/verification', icon: ShieldCheck, highlight: true },
        { name: 'Support Inquiries', path: '/admin/support', icon: MessageSquare },
        { name: 'Admin Profile', path: '/admin/profile', icon: User },
      ],
    },
  };

  const normalizedRole = (role || user?.role || 'CUSTOMER').toUpperCase();
  const config = navConfigs[normalizedRole] || navConfigs.CUSTOMER;

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-white dark:bg-[#070D18] text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800/80 w-64 select-none shadow-xs dark:shadow-none transition-colors duration-200">
      {/* Top Brand Logo & Role Badge */}
      <div className="p-5 pb-4 space-y-3 border-b border-slate-100 dark:border-white/10">
        <Link to="/" className="flex items-center space-x-2.5 group">
          <img
            src="/logo.png"
            alt="VOYARA"
            className="h-10 w-auto object-contain rounded-xl transition-transform duration-300 group-hover:scale-105"
          />
        </Link>

        {/* Role Badge Pill */}
        <div className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-[#F97360] to-orange-500 text-white text-[10px] font-black tracking-widest text-center uppercase shadow-sm">
          {config.roleBadge}
        </div>
      </div>

      {/* Navigation items */}
      <div className="flex-1 py-3 px-2.5 space-y-1 overflow-y-auto custom-scrollbar">
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
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-gradient-to-r from-orange-500/15 to-emerald-500/10 dark:from-[#F97360]/20 dark:to-emerald-500/10 text-[#F97360] dark:text-white border-l-4 border-[#F97360] font-bold shadow-xs'
                  : item.highlight
                  ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-white hover:bg-emerald-50 dark:hover:bg-white/5 font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#102A43] dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive
                    ? 'text-[#F97360]'
                    : item.highlight
                    ? 'text-emerald-500 dark:text-emerald-400'
                    : 'text-slate-400 dark:text-slate-400'
                }`}
              />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Bottom Segment: 2-Theme Switcher & User Profile */}
      <div className="p-3 border-t border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-[#0B1323]/90 space-y-2.5">
        {/* 2-Option Theme Switcher (Only Light & Dark) */}
        <div className="bg-slate-200/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-1 rounded-xl flex items-center justify-between text-[11px] font-bold gap-1">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-gradient-to-r from-[#F97360] to-orange-500 text-white shadow-xs font-black'
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
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-emerald-600 text-white shadow-xs font-black'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
            title="Switch to Dark Theme"
          >
            <Moon className="w-3.5 h-3.5" />
            <span className="text-[11px]">Dark</span>
          </button>
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-2xs">
          <div className="flex items-center space-x-2.5 min-w-0">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url.startsWith('http') ? user.avatar_url : `http://localhost:8000${user.avatar_url}`}
                alt={user?.name || 'User'}
                className="w-8 h-8 rounded-lg object-cover shadow-xs border border-emerald-500/40 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#F97360] to-emerald-500 flex items-center justify-center text-white font-bold text-xs uppercase shrink-0 shadow-xs">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#102A43] dark:text-white truncate font-sans">
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
            className="p-1.5 rounded-lg text-slate-400 dark:text-slate-300 hover:text-[#F97360] hover:bg-[#F97360]/10 transition-colors shrink-0 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block shrink-0 sticky top-0 h-screen z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#0F172A]">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
