import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('voyara_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('voyara_token') || null);
  const [loading, setLoading] = useState(true);

  // Restore authenticated session from PostgreSQL via GET /api/auth/me
  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem('voyara_token');
      if (savedToken) {
        try {
          const userData = await authApi.getMe();
          setUser(userData);
          localStorage.setItem('voyara_user', JSON.stringify(userData));
        } catch (error) {
          console.error('Session expired or invalid:', error);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const data = await authApi.login({ email, password });
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('voyara_token', data.access_token);
    localStorage.setItem('voyara_user', JSON.stringify(data.user));
    return data.user;
  };

  const register = async (userData) => {
    // Registers the account in PostgreSQL without automatically logging in
    const response = await authApi.register(userData);
    return response;
  };

  const googleAuth = async (googleData) => {
    const data = await authApi.googleAuth(googleData);
    if (data.needs_onboarding) {
      return data;
    }
    if (data.access_token && data.user) {
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem('voyara_token', data.access_token);
      localStorage.setItem('voyara_user', JSON.stringify(data.user));
    }
    return data;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('voyara_token');
    localStorage.removeItem('voyara_user');
    // Optionally call backend logout endpoint
    authApi.logout().catch(() => {});
  };

  const updateUserProfile = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('voyara_user', JSON.stringify(updatedUser));
  };

  const getRoleLabel = (role) => {
    if (role === 'ADMIN') return 'Administrator';
    if (role === 'PROVIDER') return 'Host';
    if (role === 'CUSTOMER') return 'Traveler';
    return '';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        googleAuth,
        logout,
        updateUserProfile,
        isAuthenticated: !!user,
        isCustomer: user?.role === 'CUSTOMER',
        isProvider: user?.role === 'PROVIDER' || user?.role === 'ADMIN',
        isAdmin: user?.role === 'ADMIN',
        roleLabel: user ? getRoleLabel(user.role) : '',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
