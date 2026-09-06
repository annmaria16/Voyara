import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardHeader } from './DashboardHeader';

export const DashboardLayout = ({ role, title, children }) => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeRole = (role || user?.role || 'CUSTOMER').toUpperCase();

  const defaultTitles = {
    CUSTOMER: 'TRAVELLER DASHBOARD',
    PROVIDER: 'PROVIDER DASHBOARD',
    ADMIN: 'ADMIN DASHBOARD',
  };

  const headerTitle = title || defaultTitles[activeRole] || 'DASHBOARD';

  return (
    <div className="min-h-screen flex bg-[#FFF8F0] dark:bg-[#0B1320] text-[#102A43] dark:text-slate-100 font-sans antialiased selection:bg-[#F97360] selection:text-white transition-colors duration-200">
      {/* Sidebar */}
      <DashboardSidebar
        role={activeRole}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <DashboardHeader
          title={headerTitle}
          onMenuClick={() => setSidebarOpen(true)}
          placeholder={
            activeRole === 'PROVIDER'
              ? 'Search listings, bookings...'
              : activeRole === 'ADMIN'
              ? 'Search users, properties, records...'
              : 'Search destinations or experiences...'
          }
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};
