import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFDF7] dark:bg-[#091B29] transition-colors">
        <div className="flex flex-col items-center space-y-4 text-center">
          <img src="/logo.png" alt="Voyara" className="h-20 w-auto object-contain rounded-2xl shadow-md border border-teal-500/20 dark:border-slate-800 animate-pulse" />
          <div className="w-8 h-8 border-3 border-[#087F8C] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#091B29] dark:text-white font-bold font-serif tracking-wide text-sm">Voyara — Finding Your Place...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{
          from: location,
          message: 'Sign in to discover stays, experiences, and places made for your next escape.',
        }}
        replace
      />
    );
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to proper dashboard based on user's actual role
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'PROVIDER') return <Navigate to="/provider" replace />;
    return <Navigate to="/customer" replace />;
  }

  return children;
};

