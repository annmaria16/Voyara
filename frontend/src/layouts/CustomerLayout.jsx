import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { DashboardSidebar } from '../components/dashboard/DashboardSidebar';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';

export const CustomerLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const isPlannerPage = location.pathname.includes('trip-planner') || location.pathname.includes('saved-trips');

  const getPageTitle = (pathname) => {
    if (pathname === '/customer') return 'TRAVELER DASHBOARD';
    if (pathname.includes('trip-planner') || pathname.includes('saved-trips')) return 'PLAN YOUR JOURNEY';
    if (pathname.startsWith('/search')) return 'EXPLORE STAYS';
    if (pathname.startsWith('/properties')) return 'STAY DETAILS';
    if (pathname.startsWith('/experiences')) return 'EXPERIENCES & ADVENTURES';
    if (pathname.startsWith('/booking/confirmation')) return 'JOURNEY CONFIRMATION';
    if (pathname.startsWith('/booking')) return 'SECURE CHECKOUT';
    if (pathname.startsWith('/customer/bookings')) return 'MY JOURNEYS';
    if (pathname.startsWith('/customer/messages')) return 'MESSAGES';
    if (pathname.startsWith('/customer/profile')) return 'TRAVELER PROFILE';
    if (pathname.startsWith('/customer/support')) return 'HELP & SUPPORT';
    return 'TRAVELER DASHBOARD';
  };

  return (
    <div className={`relative ${isPlannerPage ? 'h-screen overflow-hidden' : 'min-h-screen'} flex bg-[#FFFDF7] dark:bg-[#091B29] text-[#17324D] dark:text-slate-100 font-sans antialiased selection:bg-[#087F8C] selection:text-white transition-colors duration-200`}>
      {/* 1. Subtle Atmosphere & Ambient Glow Layer */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#087F8C]/10 dark:bg-[#087F8C]/15 rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-[#F6C945]/10 dark:bg-[#27B7A8]/10 rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-[#35A66F]/10 dark:bg-[#35A66F]/15 rounded-full filter blur-3xl pointer-events-none" />
      </div>

      {/* 2. Persistent Sidebar */}
      <DashboardSidebar
        role="CUSTOMER"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* 3. Main Content Area */}
      <div className={`relative z-10 flex-1 flex flex-col min-w-0 ${isPlannerPage ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
        <DashboardHeader
          title={getPageTitle(location.pathname)}
          onMenuClick={() => setSidebarOpen(true)}
          placeholder="Search destinations, stays, experiences..."
        />

        <main className={`flex-1 ${isPlannerPage ? 'p-2 sm:p-3 lg:p-4 max-w-full w-full mx-auto flex flex-col min-h-0 overflow-hidden' : 'p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default CustomerLayout;

