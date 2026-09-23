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
    CUSTOMER: 'TRAVELER DASHBOARD',
    PROVIDER: 'STAY PARTNER DASHBOARD',
    ADMIN: 'VOYARA CONTROL CENTER',
  };

  const headerTitle = title || defaultTitles[activeRole] || 'DASHBOARD';

  return (
    <div className="min-h-screen flex bg-[#FFFDF7] dark:bg-[#091B29] text-[#091B29] dark:text-slate-100 font-sans antialiased selection:bg-orange-500 selection:text-white transition-colors duration-200">
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
              ? 'Search your properties, rooms, bookings...'
              : activeRole === 'ADMIN'
              ? 'Search users, properties, bookings...'
              : 'Search destinations, stays, experiences...'
          }
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};
