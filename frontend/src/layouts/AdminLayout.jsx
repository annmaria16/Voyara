import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { DashboardSidebar } from '../components/dashboard/DashboardSidebar';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';

export const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = (pathname) => {
    if (pathname === '/admin') return 'ADMIN COMMAND CENTER';
    if (pathname.startsWith('/admin/users')) return 'USER MANAGEMENT';
    if (pathname.startsWith('/admin/properties')) return 'PROPERTIES & LISTINGS';
    if (pathname.startsWith('/admin/rooms')) return 'ROOMS & INVENTORY';
    if (pathname.startsWith('/admin/experiences')) return 'EXPERIENCES & TOURS';
    if (pathname.startsWith('/admin/bookings')) return 'BOOKINGS MONITOR';
    if (pathname.startsWith('/admin/verification')) return 'VERINOVA VERIFICATION';
    if (pathname.startsWith('/admin/support')) return 'SUPPORT INQUIRIES';
    if (pathname.startsWith('/admin/profile')) return 'ADMIN PROFILE';
    return 'ADMIN COMMAND CENTER';
  };

  return (
    <div className="min-h-screen flex bg-[#FFF8F0] dark:bg-[#0B1320] text-[#102A43] dark:text-slate-100 font-sans antialiased selection:bg-[#F97360] selection:text-white transition-colors duration-200">
      {/* Persistent Sidebar */}
      <DashboardSidebar
        role="ADMIN"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <DashboardHeader
          title={getPageTitle(location.pathname)}
          onMenuClick={() => setSidebarOpen(true)}
          placeholder="Search accounts, properties, verifications..."
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
