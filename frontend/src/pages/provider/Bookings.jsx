import React, { useState, useEffect } from 'react';
import { providerApi } from '../../api/provider';
import { VerificationBadge } from '../../components/verification/VerificationBadge';
import { VerificationModal } from '../../components/verification/VerificationModal';
import { InvoiceModal } from '../../components/payment/InvoiceModal';
import {
  BookOpen,
  Calendar,
  Users,
  MapPin,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Flame,
  UserCheck,
  Mail,
  Phone,
  Search,
  Bed,
  Home,
  Building,
  Sparkles,
  Check,
  ChevronRight,
} from 'lucide-react';

export const ProviderBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [invoiceBooking, setInvoiceBooking] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bookingsData, propsData] = await Promise.all([
        providerApi.getBookings(),
        providerApi.getProperties().catch(() => []),
      ]);
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      setProperties(Array.isArray(propsData) ? propsData : []);
    } catch (err) {
      setError(err.message || 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCheckIn = async (bookingId) => {
    setActionLoading(bookingId);
    try {
      await providerApi.checkInGuest(bookingId);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || 'Failed to mark guest as checked in.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckOut = async (bookingId) => {
    setActionLoading(bookingId);
    try {
      await providerApi.checkOutGuest(bookingId);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || 'Failed to mark guest as checked out.');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter by Property
  const propertyFilteredBookings = bookings.filter((b) => {
    if (selectedPropertyId !== 'ALL' && b.property_id !== Number(selectedPropertyId)) {
      return false;
    }
    return true;
  });

  // Filter by Search & Status Tab
  const filteredBookings = propertyFilteredBookings.filter((b) => {
    // Status filter
    if (activeTab === 'UPCOMING' && !['CONFIRMED', 'VERIFIED', 'PENDING'].includes(b.status)) {
      return false;
    }
    if (activeTab === 'CHECKED_IN' && b.status !== 'CHECKED_IN') {
      return false;
    }
    if (activeTab === 'COMPLETED' && b.status !== 'COMPLETED') {
      return false;
    }
    if (activeTab === 'CANCELLED' && b.status !== 'CANCELLED') {
      return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const guestName = (b.user?.name || b.customer_name || '').toLowerCase();
      const guestEmail = (b.user?.email || '').toLowerCase();
      const bookingNo = (b.booking_number || `VOY-${b.id}`).toLowerCase();
      const propName = (b.property?.name || '').toLowerCase();
      const roomName = (b.booking_rooms?.[0]?.room_name || b.room_name || '').toLowerCase();

      return (
        guestName.includes(query) ||
        guestEmail.includes(query) ||
        bookingNo.includes(query) ||
        propName.includes(query) ||
        roomName.includes(query)
      );
    }

    return true;
  });

  const upcomingCount = propertyFilteredBookings.filter((b) => ['CONFIRMED', 'VERIFIED', 'PENDING'].includes(b.status)).length;
  const checkedInCount = propertyFilteredBookings.filter((b) => b.status === 'CHECKED_IN').length;
  const completedCount = propertyFilteredBookings.filter((b) => b.status === 'COMPLETED').length;
  const cancelledCount = propertyFilteredBookings.filter((b) => b.status === 'CANCELLED').length;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#087F8C]/10 border border-[#087F8C]/30 text-[#087F8C] dark:text-[#27B7A8] text-xs font-bold mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#087F8C] dark:text-[#27B7A8]" />
            <span>Stay Partner Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#091B29] dark:text-white tracking-tight">
            Arrivals & Guest Reservations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-light">
            Real-time arrivals board, verified stays, guest profiles, and invoices.
          </p>
        </div>

        {/* Property Selector Filter */}
        {properties.length > 0 && (
          <div className="flex items-center space-x-2 shrink-0">
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="px-4 py-2.5 bg-white dark:bg-[#0F273D] border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-[#091B29] dark:text-white shadow-xs focus:outline-none focus:border-[#087F8C] cursor-pointer"
            >
              <option value="ALL">All Properties ({properties.length})</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.city})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-2xl text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Control Bar: Tabs & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Arrivals Board Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 custom-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ALL'
                ? 'bg-[#091B29] text-white shadow-sm dark:bg-[#087F8C]'
                : 'bg-white dark:bg-[#0F273D] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
            }`}
          >
            All Reservations ({propertyFilteredBookings.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('UPCOMING')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'UPCOMING'
                ? 'bg-[#087F8C] text-white shadow-sm'
                : 'bg-white dark:bg-[#0F273D] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
            }`}
          >
            Upcoming Guests ({upcomingCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CHECKED_IN')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
              activeTab === 'CHECKED_IN'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-[#0F273D] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Checked-In ({checkedInCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('COMPLETED')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'COMPLETED'
                ? 'bg-[#35A66F] text-white shadow-sm'
                : 'bg-white dark:bg-[#0F273D] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
            }`}
          >
            Completed Stays ({completedCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CANCELLED')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'CANCELLED'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white dark:bg-[#0F273D] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
            }`}
          >
            Cancelled ({cancelledCount})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search guest, booking #, stay..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-700 rounded-2xl text-xs text-[#091B29] dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#087F8C] shadow-xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="w-8 h-8 border-3 border-[#087F8C] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-16 text-center border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-[#087F8C]/10 text-[#087F8C] dark:text-[#27B7A8] mx-auto flex items-center justify-center">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-serif font-bold text-[#091B29] dark:text-white">
              No reservations found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-light">
              {searchQuery ? 'Try modifying your search keywords or filter tab.' : 'When guests book your accommodations or experiences, live reservations and check-in actions appear here.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredBookings.map((b) => {
            const isCancelled = b.status === 'CANCELLED';
            const isCheckedIn = b.status === 'CHECKED_IN';
            const isCompleted = b.status === 'COMPLETED';
            const isConfirmed = b.status === 'CONFIRMED' || b.status === 'VERIFIED' || b.status === 'PENDING';
            const guestName = b.user?.name || b.customer_name || 'Guest Traveler';
            const guestEmail = b.user?.email || 'N/A';
            const guestPhone = b.user?.phone || '';
            const propertyName = b.property?.name || 'Property';
            const roomName = b.booking_rooms?.[0]?.room_name || b.room_name || 'Standard Unit';
            const experience = b.booking_experiences?.[0];
            const isActionBusy = actionLoading === b.id;
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const isBeforeCheckIn = b.check_in && b.check_in > todayStr;
            const formattedCheckIn = b.check_in ? new Date(b.check_in + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

            // Financial Calculations
            const originalGross = b.original_total_amount || b.total_amount || 0;
            const partnerSettlement = b.provider_settlement_amount !== undefined && b.provider_settlement_amount !== null
              ? b.provider_settlement_amount
              : isConfirmed
              ? Math.round(originalGross * 0.90)
              : 0;
            const voyaraCommission = b.commission_amount !== undefined && b.commission_amount !== null
              ? b.commission_amount
              : isConfirmed
              ? Math.round(originalGross * 0.10)
              : 0;
            const isCommissionFinalized = b.commission_status === 'FINALIZED';

            return (
              <div
                key={b.id}
                data-testid={`provider-booking-card-${b.id}`}
                className="bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:border-[#087F8C]/40 transition-all"
              >
                {/* 1. Header Strip: Booking Reference, Status & Trust Badges */}
                <div className="bg-slate-50/80 dark:bg-slate-800/40 px-6 py-3.5 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-3 flex-wrap gap-y-1.5">
                    {/* Booking Reference */}
                    <span className="font-mono text-xs font-bold text-[#087F8C] dark:text-[#27B7A8] bg-[#087F8C]/10 px-3 py-1 rounded-xl border border-[#087F8C]/20 shadow-2xs">
                      {b.booking_number || `VOY-${b.id}`}
                    </span>

                    {/* Booking Status Pill */}
                    <span
                      data-testid="provider-booking-status"
                      className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                        isCancelled
                          ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                          : isCheckedIn
                          ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30'
                          : isCompleted
                          ? 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30'
                          : 'bg-[#35A66F]/15 text-[#236C48] dark:text-emerald-300 border border-[#35A66F]/30'
                      }`}
                    >
                      {b.status === 'CHECKED_IN' ? 'CHECKED IN' : b.status}
                    </span>

                    {/* Commission Status Badge */}
                    <span
                      data-testid="provider-commission-status"
                      className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        isCommissionFinalized
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                      }`}
                    >
                      <span>{isCommissionFinalized ? '✓ Commission Finalized' : '⏳ Commission Pending Check-In'}</span>
                    </span>

                    {/* Booking Date */}
                    {b.created_at && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>Booked on {new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 flex-wrap gap-y-1.5">
                    {/* VeriNova Trust Badge */}
                    <VerificationBadge
                      status={isCancelled ? 'NEEDS_REVIEW' : 'VERIFIED'}
                      size="sm"
                      onClick={() => setSelectedBookingId(b.id)}
                      showDetailsHint={true}
                    />

                    {/* Payment Pill */}
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold border border-blue-500/20">
                      <CreditCard className="w-3 h-3" />
                      <span>{isCancelled ? 'Refund Reconciled' : 'Paid via Razorpay'}</span>
                    </span>
                  </div>
                </div>

                {/* 2. Structured Card Body (Clean Columns) */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-6 items-center">
                  {/* Column 1: Guest Information (xl:col-span-3) */}
                  <div className="xl:col-span-3 flex items-start space-x-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#091B29] to-[#087F8C] text-white font-serif font-bold text-lg flex items-center justify-center shrink-0 shadow-md shadow-[#087F8C]/10">
                      {guestName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Guest Traveler
                      </span>
                      <h3 className="text-sm font-serif font-bold text-[#091B29] dark:text-white truncate">
                        {guestName}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center space-x-1">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{guestEmail}</span>
                      </p>
                      {guestPhone && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{guestPhone}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Column 2: Accommodation Details (xl:col-span-3) */}
                  <div className="xl:col-span-3 space-y-1 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800/80 pt-4 md:pt-0 md:pl-6 min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Property & Room Stay
                    </span>
                    <strong className="text-xs font-bold text-[#091B29] dark:text-white block truncate">
                      {propertyName}
                    </strong>
                    <div className="flex items-center space-x-1 text-[11px] text-slate-600 dark:text-slate-300">
                      <Bed className="w-3.5 h-3.5 text-[#087F8C] dark:text-[#27B7A8] shrink-0" />
                      <span className="truncate">{roomName}</span>
                    </div>
                    {experience && (
                      <span className="inline-flex items-center space-x-1 text-[11px] text-orange-600 dark:text-orange-400 font-semibold bg-orange-50 dark:bg-orange-950/30 px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-900/40">
                        <Flame className="w-3 h-3 text-orange-500 shrink-0" />
                        <span className="truncate">{experience.experience_title}</span>
                      </span>
                    )}
                  </div>

                  {/* Column 3: Dates & Occupancy (xl:col-span-3) */}
                  <div className="xl:col-span-3 space-y-1 border-t xl:border-t-0 xl:border-l border-slate-100 dark:border-slate-800/80 pt-4 xl:pt-0 xl:pl-6 min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Check-In / Check-Out
                    </span>
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-[#091B29] dark:text-white">
                      <Calendar className="w-3.5 h-3.5 text-[#087F8C] dark:text-[#27B7A8] shrink-0" />
                      <span>{b.check_in} ➔ {b.check_out}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{b.total_nights || 1} Night(s) • {b.total_guests || 2} Guest(s)</span>
                    </div>
                  </div>

                  {/* Column 4: Payout & Actions (xl:col-span-3) */}
                  <div className="xl:col-span-3 flex flex-row xl:flex-col items-center xl:items-end justify-between xl:justify-center gap-4 border-t xl:border-t-0 xl:border-l border-slate-100 dark:border-slate-800/80 pt-4 xl:pt-0 xl:pl-6 shrink-0">
                    {/* Partner Net Settlement & Breakdown */}
                    <div className="text-left xl:text-right space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        {isCancelled ? 'Partner Retained Settlement' : 'Your Payout (90%)'}
                      </span>
                      <span
                        data-testid="provider-settlement-amount"
                        className="text-xl font-serif font-black text-emerald-600 dark:text-emerald-400 block"
                      >
                        ₹{partnerSettlement.toLocaleString('en-IN')}
                      </span>

                      <div className="text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5">
                        <div className="flex items-center justify-start xl:justify-end space-x-1">
                          <span>Gross:</span>
                          <strong className="text-slate-700 dark:text-slate-300">₹{originalGross.toLocaleString('en-IN')}</strong>
                        </div>
                        <div className="flex items-center justify-start xl:justify-end space-x-1">
                          <span>Voyara (10%):</span>
                          <span data-testid="provider-commission-amount" className="text-slate-700 dark:text-slate-300">₹{voyaraCommission.toLocaleString('en-IN')}</span>
                        </div>
                        {isCancelled && (
                          <div className="text-rose-500 font-medium">
                            Refunded to Guest: ₹{(b.refund_amount || 0).toLocaleString('en-IN')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                      {/* Check-In Action Button */}
                      {isConfirmed && (
                        isBeforeCheckIn ? (
                          <div className="relative group">
                            <button
                              type="button"
                              disabled={true}
                              data-testid="mark-checked-in-btn"
                              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-not-allowed select-none"
                            >
                              <UserCheck className="w-3.5 h-3.5 opacity-60" />
                              <span>Mark Checked-In</span>
                            </button>
                            <div className="absolute bottom-full right-0 mb-2 hidden group-hover:flex items-center space-x-1 whitespace-nowrap z-20 px-2.5 py-1.5 bg-[#091B29] text-amber-300 text-[10px] font-semibold rounded-lg shadow-xl border border-slate-700 pointer-events-none">
                              <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>Available on {formattedCheckIn || b.check_in}</span>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCheckIn(b.id)}
                            disabled={isActionBusy}
                            data-testid="mark-checked-in-btn"
                            className="px-3.5 py-2 bg-gradient-to-r from-[#087F8C] to-[#066570] hover:from-[#066570] hover:to-[#044c54] text-white rounded-xl text-xs font-bold shadow-md shadow-[#087F8C]/20 transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{isActionBusy ? 'Updating...' : 'Mark Checked-In'}</span>
                          </button>
                        )
                      )}

                      {/* Check-Out Action Button */}
                      {isCheckedIn && (
                        <button
                          type="button"
                          onClick={() => handleCheckOut(b.id)}
                          disabled={isActionBusy}
                          data-testid="mark-checked-out-btn"
                          className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isActionBusy ? 'Updating...' : 'Mark Checked-Out'}</span>
                        </button>
                      )}

                      {/* Tax Invoice Modal Button */}
                      <button
                        type="button"
                        onClick={() => setInvoiceBooking(b)}
                        data-testid="view-invoice-btn"
                        className="px-3 py-2 bg-[#FFFDF7] dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-slate-700 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all inline-flex items-center space-x-1 cursor-pointer shadow-2xs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Invoice</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedBookingId && (
        <VerificationModal
          bookingId={selectedBookingId}
          isOpen={!!selectedBookingId}
          onClose={() => setSelectedBookingId(null)}
        />
      )}

      {invoiceBooking && (
        <InvoiceModal
          booking={invoiceBooking}
          isOpen={!!invoiceBooking}
          onClose={() => setInvoiceBooking(null)}
        />
      )}
    </div>
  );
};

export default ProviderBookings;


