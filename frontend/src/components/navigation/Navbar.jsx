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
  Compass,
  Home,
  Flame,
  Info
} from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, logout, isCustomer, isProvider, isAdmin } = useAuth();
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

  const handleAuthGuardedNav = (targetPath) => {
    if (isAuthenticated) {
      navigate(targetPath);
    } else {
      navigate('/login', {
        state: {
          from: targetPath,
          message: 'Sign in to explore verified stays and host experiences.',
        },
      });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#087F8C]/95 dark:bg-[#091B29]/95 backdrop-blur-md text-white border-b border-white/15 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo & Slogan */}
          <Link to="/" className="flex items-center space-x-3 group py-1">
            <img
              src="/logo.png"
              alt="VOYARA"
              className="h-12 sm:h-14 w-auto object-contain rounded-xl transition-transform duration-300 group-hover:scale-105"
            />
            <div className="hidden sm:block">
              <span className="block text-[11px] font-extrabold tracking-widest text-[#F6C945] uppercase">
                Find Your Place.
              </span>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <button
              type="button"
              onClick={() => handleAuthGuardedNav('/customer')}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
                location.pathname === '/customer'
                  ? 'bg-white/20 text-white shadow-xs'
                  : 'text-white/90 hover:text-white hover:bg-white/10'
              }`}
            >
              Explore
            </button>

            <button
              type="button"
              onClick={() => handleAuthGuardedNav('/search')}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
                location.pathname.startsWith('/search') || location.pathname.startsWith('/properties')
                  ? 'bg-white/20 text-white shadow-xs'
                  : 'text-white/90 hover:text-white hover:bg-white/10'
              }`}
            >
              Stays
            </button>

            <button
              type="button"
              onClick={() => handleAuthGuardedNav('/experiences')}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
                location.pathname.startsWith('/experiences')
                  ? 'bg-white/20 text-white shadow-xs'
                  : 'text-white/90 hover:text-white hover:bg-white/10'
              }`}
            >
              Experiences
            </button>

            <Link
              to="/about"
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all ${
                location.pathname === '/about'
                  ? 'bg-white/20 text-white shadow-xs'
                  : 'text-white/90 hover:text-white hover:bg-white/10'
              }`}
            >
              About
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="hidden md:flex items-center space-x-3">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/register"
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-white/15 hover:bg-white/25 border border-white/25 transition-all shadow-xs"
                >
                  Register
                </Link>
                <Link
                  to="/login"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#F97316] hover:bg-[#FF8A3D] text-white shadow-md shadow-orange-950/20 transition-all font-sans"
                >
                  Login
                </Link>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to={getDashboardPath()}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0F9D9A] hover:bg-[#27B7A8] text-white shadow-md transition-all border border-white/20"
                >
                  <LayoutDashboard className="w-4 h-4 text-[#F6C945]" />
                  <span>
                    {isAdmin ? 'Voyara Control Center' : isProvider ? 'Stay Partner Dashboard' : 'Traveler Dashboard'}
                  </span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-white/80 hover:text-[#F97316] hover:bg-white/10 transition-colors cursor-pointer"
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
              className="p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/15 space-y-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleAuthGuardedNav('/customer');
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-white hover:bg-white/10"
            >
              Explore
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleAuthGuardedNav('/search');
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-white hover:bg-white/10"
            >
              Stays
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleAuthGuardedNav('/experiences');
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-white hover:bg-white/10"
            >
              Experiences
            </button>
            <Link
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-white hover:bg-white/10"
            >
              About Voyara
            </Link>

            {!isAuthenticated ? (
              <div className="pt-2 space-y-2">
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center px-4 py-2.5 rounded-xl text-xs font-bold bg-white/15 text-white border border-white/25"
                >
                  Register
                </Link>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center px-4 py-2.5 rounded-xl text-xs font-bold bg-[#F97316] text-white"
                >
                  Login
                </Link>
              </div>
            ) : (
              <div className="pt-2 space-y-2">
                <Link
                  to={getDashboardPath()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0F9D9A] text-white"
                >
                  {isAdmin ? 'Voyara Control Center' : isProvider ? 'Stay Partner Dashboard' : 'Traveler Dashboard'}
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="block w-full text-center px-4 py-2 rounded-xl text-xs font-bold text-rose-200 hover:bg-white/10"
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


