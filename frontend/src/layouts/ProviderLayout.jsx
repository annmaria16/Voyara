import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { DashboardSidebar } from '../components/dashboard/DashboardSidebar';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';

export const ProviderLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = (pathname) => {
    if (pathname === '/provider') return 'PROVIDER PORTAL';
    if (pathname === '/provider/properties/new') return 'ADD NEW PROPERTY';
    if (pathname.startsWith('/provider/properties')) return 'MY PROPERTIES';
    if (pathname.startsWith('/provider/rooms')) return 'ROOMS & INVENTORY';
    if (pathname.startsWith('/provider/availability')) return 'CALENDAR & AVAILABILITY';
    if (pathname.startsWith('/provider/experiences')) return 'EXPERIENCES & TOURS';
    if (pathname.startsWith('/provider/bookings')) return 'GUEST RESERVATIONS';
    if (pathname.startsWith('/provider/profile')) return 'HOST PROFILE';
    if (pathname.startsWith('/provider/support')) return 'SUPPORT DESK';
    return 'PROVIDER PORTAL';
  };

  return (
    <div className="min-h-screen flex bg-[#FFF8F0] dark:bg-[#0B1320] text-[#102A43] dark:text-slate-100 font-sans antialiased selection:bg-[#F97360] selection:text-white transition-colors duration-200">
      {/* Persistent Sidebar */}
      <DashboardSidebar
        role="PROVIDER"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <DashboardHeader
          title={getPageTitle(location.pathname)}
          onMenuClick={() => setSidebarOpen(true)}
          placeholder="Search properties, rooms, bookings..."
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
