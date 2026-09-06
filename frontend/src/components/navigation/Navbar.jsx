import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Sparkles,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  User,
  ShieldCheck,
} from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, logout, isCustomer, isProvider, isAdmin, roleLabel } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardPath = () => {
    if (isAdmin) return '/admin';
    if (isProvider) return '/provider';
    return '/customer';
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md text-white border-b border-white/10 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center space-x-3 group py-1">
            <img
              src="/logo.png"
              alt="VOYARA"
              className="h-12 sm:h-14 w-auto object-contain rounded-xl transition-transform duration-300 group-hover:scale-105"
            />
          </Link>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              to="/about"
              className="px-3.5 py-2 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              About Voyara
            </Link>

            {!isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors border border-emerald-500/30"
                >
                  Become a Host
                </Link>
                <Link
                  to="/login"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white shadow-md shadow-orange-500/20 transition-all"
                >
                  Sign In
                </Link>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to={getDashboardPath()}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all border border-emerald-400/30"
                >
                  <LayoutDashboard className="w-4 h-4 text-emerald-200" />
                  <span>Go to Dashboard</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-white/70 hover:text-[#F97360] hover:bg-white/10 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10 space-y-2">
            <Link
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/10"
            >
              About Voyara
            </Link>

            {!isAuthenticated ? (
              <div className="pt-2 space-y-2">
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                >
                  Become a Host
                </Link>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#F97360] to-orange-500 text-white"
                >
                  Sign In
                </Link>
              </div>
            ) : (
              <div className="pt-2 space-y-2">
                <Link
                  to={getDashboardPath()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white"
                >
                  Go to Dashboard
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="block w-full text-center px-4 py-2 rounded-xl text-xs font-bold text-rose-300 hover:bg-white/10"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
