import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { DashboardSidebar } from '../components/dashboard/DashboardSidebar';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';

export const CustomerLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = (pathname) => {
    if (pathname === '/customer') return 'TRAVELLER DASHBOARD';
    if (pathname.startsWith('/search')) return 'EXPLORE STAYS';
    if (pathname.startsWith('/properties')) return 'PROPERTY DETAILS';
    if (pathname.startsWith('/experiences')) return 'EXPERIENCES & ACTIVITIES';
    if (pathname.startsWith('/booking/confirmation')) return 'BOOKING CONFIRMATION';
    if (pathname.startsWith('/booking')) return 'SECURE RESERVATION';
    if (pathname.startsWith('/customer/bookings')) return 'MY RESERVATIONS';
    if (pathname.startsWith('/customer/profile')) return 'PROFILE & SETTINGS';
    if (pathname.startsWith('/customer/support')) return 'HELP & SUPPORT';
    return 'TRAVELLER PORTAL';
  };

  return (
    <div className="min-h-screen flex bg-[#FFF8F0] dark:bg-[#0B1320] text-[#102A43] dark:text-slate-100 font-sans antialiased selection:bg-[#F97360] selection:text-white transition-colors duration-200">
      {/* Persistent Sidebar */}
      <DashboardSidebar
        role="CUSTOMER"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <DashboardHeader
          title={getPageTitle(location.pathname)}
          onMenuClick={() => setSidebarOpen(true)}
          placeholder="Search destinations, stays, experiences..."
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
