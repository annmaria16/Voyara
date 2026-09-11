import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { DashboardSidebar } from '../components/dashboard/DashboardSidebar';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';

export const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = (pathname) => {
    if (pathname === '/admin') return 'VOYARA CONTROL CENTER';
    if (pathname.startsWith('/admin/users')) return 'USER DIRECTORY';
    if (pathname.startsWith('/admin/properties')) return 'PROPERTY REVIEW DESK';
    if (pathname.startsWith('/admin/rooms')) return 'ROOM INVENTORY';
    if (pathname.startsWith('/admin/experiences')) return 'EXPERIENCES & TOURS';
    if (pathname.startsWith('/admin/bookings')) return 'BOOKINGS MONITOR';
    if (pathname.startsWith('/admin/verification')) return 'VERINOVA COMMAND CENTER';
    if (pathname.startsWith('/admin/support')) return 'SUPPORT DESK';
    if (pathname.startsWith('/admin/profile')) return 'CONTROL CENTER PROFILE';
    return 'VOYARA CONTROL CENTER';
  };

  return (
    <div className="relative min-h-screen flex bg-[#FFFDF7] dark:bg-[#091B29] text-[#17324D] dark:text-slate-100 font-sans antialiased selection:bg-[#087F8C] selection:text-white transition-colors duration-200 overflow-x-hidden">
      {/* 1. Subtle Atmosphere & Ambient Glow Layer */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#087F8C]/10 dark:bg-[#087F8C]/15 rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-[#F6C945]/10 dark:bg-[#27B7A8]/10 rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-[#35A66F]/10 dark:bg-[#35A66F]/15 rounded-full filter blur-3xl pointer-events-none" />
      </div>

      {/* 2. Persistent Sidebar */}
      <DashboardSidebar
        role="ADMIN"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* 3. Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 min-h-screen">
        <DashboardHeader
          title={getPageTitle(location.pathname)}
          onMenuClick={() => setSidebarOpen(true)}
          placeholder="Search accounts, properties, verifications..."
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

