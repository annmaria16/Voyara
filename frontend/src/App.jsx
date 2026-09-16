import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { CustomerLayout } from './layouts/CustomerLayout';
import { ProviderLayout } from './layouts/ProviderLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Auth Pages
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';

// Customer & Marketplace Pages
import { LandingPage } from './pages/customer/LandingPage';
import { SearchPage } from './pages/customer/Search';
import { PropertyDetails } from './pages/customer/PropertyDetails';
import { ExperienceDetails } from './pages/customer/ExperienceDetails';
import { BookingPage } from './pages/customer/Booking';
import { BookingConfirmation } from './pages/customer/BookingConfirmation';
import { MyBookings } from './pages/customer/MyBookings';
import { CustomerDashboard } from './pages/customer/Dashboard';

// Provider Pages
import { ProviderDashboard } from './pages/provider/Dashboard';
import { ProviderProperties } from './pages/provider/Properties';
import { AddProperty } from './pages/provider/AddProperty';
import { EditProperty } from './pages/provider/EditProperty';
import { ProviderRooms } from './pages/provider/Rooms';
import { ProviderAvailability } from './pages/provider/Availability';
import { ProviderExperiences } from './pages/provider/Experiences';
import { ProviderBookings } from './pages/provider/Bookings';

// Admin Pages
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminUsers } from './pages/admin/Users';
import { AdminProperties } from './pages/admin/Properties';
import { AdminBookings } from './pages/admin/Bookings';
import { VerificationCenter } from './pages/admin/VerificationCenter';
import { AdminSupport } from './pages/admin/Support';


// Common / Universal Pages
import { ProfilePage } from './pages/common/Profile';
import { SupportPage } from './pages/common/Support';
import { AboutPage } from './pages/common/About';
import { NotFoundPage } from './pages/common/NotFound';
import { ForbiddenPage } from './pages/common/Forbidden';

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Informational Routes (Landing & About) */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/support" element={<SupportPage />} />
            </Route>

            {/* Authenticated Customer / Traveller Portal (All pages with Persistent Sidebar) */}
            <Route
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER', 'PROVIDER', 'ADMIN']}>
                  <CustomerLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/customer" element={<CustomerDashboard />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/properties/:id" element={<PropertyDetails />} />
              <Route path="/experiences" element={<ExperienceDetails />} />
              <Route path="/experiences/:id" element={<ExperienceDetails />} />
              <Route path="/booking" element={<BookingPage />} />
              <Route path="/booking/confirmation/:id" element={<BookingConfirmation />} />
              <Route path="/customer/bookings" element={<MyBookings />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              <Route path="/bookings" element={<MyBookings />} />
              <Route path="/customer/profile" element={<ProfilePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/customer/support" element={<SupportPage />} />
            </Route>

            {/* Authenticated Provider Portal (Persistent Sidebar) */}
            <Route
              path="/provider"
              element={
                <ProtectedRoute allowedRoles={['PROVIDER', 'ADMIN']}>
                  <ProviderLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ProviderDashboard />} />
              <Route path="properties" element={<ProviderProperties />} />
              <Route path="properties/new" element={<AddProperty />} />
              <Route path="properties/:id/edit" element={<EditProperty />} />
              <Route path="rooms" element={<ProviderRooms />} />
              <Route path="availability" element={<ProviderAvailability />} />
              <Route path="experiences" element={<ProviderExperiences />} />
              <Route path="bookings" element={<ProviderBookings />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="support" element={<SupportPage />} />
            </Route>

            {/* Authenticated Admin Command Center (Persistent Sidebar) */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="properties" element={<AdminProperties />} />
              <Route path="rooms" element={<AdminProperties />} />
              <Route path="experiences" element={<AdminProperties />} />
              <Route path="bookings" element={<AdminBookings />} />
              <Route path="verification" element={<VerificationCenter />} />
              <Route path="support" element={<AdminSupport />} />
              <Route path="profile" element={<ProfilePage />} />

            </Route>

            {/* Auth Standalone Pages */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Error & Fallback Routes */}
            <Route path="/forbidden" element={<ForbiddenPage />} />
            <Route path="/404" element={<NotFoundPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
