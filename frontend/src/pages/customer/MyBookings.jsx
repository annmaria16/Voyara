import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { customerApi } from '../../api/customer';
import { VerificationBadge } from '../../components/verification/VerificationBadge';
import { VerificationModal } from '../../components/verification/VerificationModal';
import { InvoiceModal } from '../../components/payment/InvoiceModal';
import { ReviewModal } from '../../components/review/ReviewModal';
import { ViewReviewModal } from '../../components/review/ViewReviewModal';
import { CancellationModal } from '../../components/booking/CancellationModal';
import { StayInformationModal } from '../../components/booking/StayInformationModal';
import { BookingMessageModal } from '../../components/booking/BookingMessageModal';
import { getBookingStatusTheme } from '../../utils/bookingStatusTheme';
import { resolveImageUrl } from '../../utils/imageUrl';
import {
  Calendar,
  MapPin,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  XCircle,
  Compass,
  Sparkles,
  FileText,
  CreditCard,
  Star,
  Receipt,
  UserCheck,
  Clock,
  CheckCircle2,
  MessageSquare,
  Info,
  AlertTriangle,
  RotateCcw,
  Building,
} from 'lucide-react';

export const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL', 'UPCOMING', 'CHECKED_IN', 'COMPLETED', 'CANCELLED'
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [stayInfoBookingId, setStayInfoBookingId] = useState(null);
  const [messagingBooking, setMessagingBooking] = useState(null);
  const [invoiceBooking, setInvoiceBooking] = useState(null);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [viewReviewBooking, setViewReviewBooking] = useState(null);
  const [cancellationBooking, setCancellationBooking] = useState(null);
  const [error, setError] = useState('');

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await customerApi.getMyBookings();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'CANCELLED') return b.status === 'CANCELLED' || b.status === 'FAILED';
    if (activeTab === 'CHECKED_IN') return b.status === 'CHECKED_IN';
    if (activeTab === 'COMPLETED') return b.status === 'COMPLETED' || b.status === 'CHECKED_OUT';
    if (activeTab === 'UPCOMING') return ['CONFIRMED', 'VERIFIED', 'PENDING', 'PAYMENT_PENDING'].includes(b.status);
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black font-serif text-[#17324D] dark:text-white tracking-tight">
            My Journeys
          </h1>
          <p className="text-xs sm:text-sm text-[#607080] dark:text-slate-300 mt-1 font-light">
            Your verified sanctuary stays, digital boarding itineraries, and travel history.
          </p>
        </div>

        <Link
          to="/search"
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white text-xs font-bold rounded-2xl shadow-md shadow-[#F97316]/20 transition-all cursor-pointer"
        >
          <Compass className="w-4 h-4" />
          <span>Discover Another Stay</span>
        </Link>
      </div>

      {/* Tabs Filter */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        {[
          { key: 'ALL', label: `All Journeys (${bookings.length})` },
          { key: 'UPCOMING', label: `Upcoming (${bookings.filter(b => ['CONFIRMED', 'VERIFIED', 'PENDING', 'PAYMENT_PENDING'].includes(b.status)).length})` },
          { key: 'CHECKED_IN', label: `Checked-In (${bookings.filter(b => b.status === 'CHECKED_IN').length})` },
          { key: 'COMPLETED', label: `Completed (${bookings.filter(b => ['COMPLETED', 'CHECKED_OUT'].includes(b.status)).length})` },
          { key: 'CANCELLED', label: `Cancelled / Failed (${bookings.filter(b => ['CANCELLED', 'FAILED'].includes(b.status)).length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${activeTab === tab.key
              ? 'bg-[#087F8C] text-white shadow-xs'
              : 'text-[#607080] dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center space-x-3 text-rose-700 dark:text-rose-300 text-xs font-bold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-[#087F8C] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-[#607080] dark:text-slate-300">Retrieving your bookings from database...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="card-voyara rounded-3xl p-12 sm:p-16 text-center border border-slate-100 dark:border-teal-900/40 space-y-4 shadow-sm bg-white dark:bg-[#0F273D]">
          <div className="w-16 h-16 rounded-3xl bg-orange-500/10 text-[#F97316] mx-auto flex items-center justify-center">
            <Compass className="w-8 h-8 stroke-[1.5]" />
          </div>
          <h3 className="text-xl font-bold font-serif text-[#17324D] dark:text-white">
            {activeTab === 'UPCOMING'
              ? 'No Upcoming Journeys'
              : activeTab === 'CHECKED_IN'
                ? 'No Currently Checked-In Stays'
                : activeTab === 'COMPLETED'
                  ? 'No Completed Journeys'
                  : activeTab === 'CANCELLED'
                    ? 'No Cancelled or Failed Bookings'
                    : 'No Bookings Found'}
          </h3>
          <p className="text-xs sm:text-sm text-[#607080] dark:text-slate-300 max-w-md mx-auto leading-relaxed">
            {activeTab === 'UPCOMING'
              ? 'You have no active trips booked right now. Find your next tranquil escape.'
              : 'Explore our handpicked hill-station stays and seaside retreats across India.'}
          </p>
          <Link
            to="/search"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-bold rounded-2xl text-xs shadow-md shadow-[#F97316]/20 transition-all cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>Explore Stays & Sanctuaries</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredBookings.map((b) => {
            const theme = getBookingStatusTheme(b.status);
            const StatusIcon = theme.icon;
            const isCancelled = b.status === 'CANCELLED';
            const isFailed = b.status === 'FAILED';
            const isCheckedIn = b.status === 'CHECKED_IN';
            const isCompleted = b.status === 'COMPLETED' || b.status === 'CHECKED_OUT';
            const isConfirmed = ['CONFIRMED', 'VERIFIED', 'PENDING', 'PAYMENT_PENDING'].includes(b.status);
            const canCancel = ['CONFIRMED', 'VERIFIED', 'PENDING'].includes(b.status) && b.is_cancellable !== false;
            const isDeadlinePassed = ['CONFIRMED', 'VERIFIED', 'PENDING'].includes(b.status) && b.is_cancellable === false;
            const roomName = b.booking_rooms?.[0]?.room_name || 'Room Stay';
            const expTitle = b.booking_experiences?.[0]?.experience_title;
            const propImage = resolveImageUrl(
              b.property?.images?.[0]?.image_url ||
              (typeof b.property?.images?.[0] === 'string' ? b.property.images[0] : null) ||
              b.property?.cover_image ||
              b.property_image
            ) || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80';

            // Authoritative timeline steps
            const timelineSteps = [
              { label: 'Booked', stepNum: 1 },
              { label: 'Verified', stepNum: 2 },
              { label: 'Confirmed', stepNum: 3 },
              { label: 'Checked-In', stepNum: 4 },
              { label: 'Stay', stepNum: 5 },
              { label: 'Checkout', stepNum: 6 },
              { label: 'Review', stepNum: 7 },
            ];

            return (
              <div
                key={b.id}
                data-testid={`booking-card-${b.id}`}
                className={`card-voyara rounded-3xl p-6 sm:p-8 border ${theme.cardBorder} ${theme.cardBg} ${theme.glowClass} shadow-sm hover:shadow-md transition-all space-y-6 relative overflow-hidden`}
              >
                {/* Top Colored Accent Bar */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${theme.cardAccentBar}`} />

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4 pt-1">
                  <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
                    <span className={`text-xs font-mono uppercase font-bold px-3 py-1 rounded-xl ${theme.bookingPillClasses}`}>
                      {b.booking_number}
                    </span>
                    <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-xl border ${theme.verinovaPillClasses}`}>
                      {b.verinova_verification_id || `VN-TX-${String(b.id).padStart(8, '0')}`}
                    </span>
                    <span className="text-xs text-[#607080] dark:text-slate-400 font-medium">
                      Booked on {new Date(b.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold border border-blue-500/20">
                      <CreditCard className="w-3 h-3" />
                      <span>{isFailed ? 'Payment Unsuccessful' : 'Razorpay Verified'}</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                    {/* Review Button if completed */}
                    {isCompleted && (
                      b.review ? (
                        <button
                          type="button"
                          data-testid={`view-review-btn-${b.id}`}
                          onClick={() => setViewReviewBooking(b)}
                          className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-bold border border-amber-500/30 transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                        >
                          <Star className="w-3.5 h-3.5 fill-[#F6C945] text-[#F6C945]" />
                          <span>Rated {Number(b.review.rating).toFixed(1)}/5 • View Review</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          data-testid={`rate-stay-btn-${b.id}`}
                          onClick={() => setReviewBooking({ ...b, booking_id: b.id, property_name: b.property?.name })}
                          className="px-3 py-1.5 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1 cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5 fill-white" />
                          <span>Rate Stay</span>
                        </button>
                      )
                    )}

                    {/* Stay Information Button */}
                    {!isFailed && (
                      <button
                        type="button"
                        data-testid={`stay-info-btn-${b.id}`}
                        onClick={() => setStayInfoBookingId(b.id)}
                        className="px-3 py-1.5 bg-[#087F8C]/10 hover:bg-[#087F8C]/20 text-[#087F8C] dark:text-[#27B7A8] border border-[#087F8C]/30 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer shadow-2xs"
                      >
                        <Info className="w-3.5 h-3.5" />
                        <span>Stay Info</span>
                      </button>
                    )}

                    {/* Message Stay Partner Button */}
                    {!isCancelled && !isFailed && (
                      <Link
                        to={`/customer/messages?booking_id=${b.id}`}
                        data-testid={`message-host-btn-${b.id}`}
                        className="px-3 py-1.5 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white rounded-xl text-xs font-bold transition-all inline-flex items-center space-x-1 cursor-pointer shadow-xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Message Stay Partner</span>
                      </Link>
                    )}

                    {!isFailed && (
                      <button
                        type="button"
                        data-testid={`invoice-btn-${b.id}`}
                        onClick={() => setInvoiceBooking(b)}
                        className="px-3 py-1.5 bg-[#FFFDF7] dark:bg-[#091B29] hover:bg-orange-50 dark:hover:bg-slate-800 text-[#F97316] border border-orange-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Invoice</span>
                      </button>
                    )}

                    {/* Dynamic Status Badge */}
                    <span
                      data-testid={`booking-status-${b.id}`}
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 border ${theme.badgeClasses}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${theme.dotClass}`} />
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span>{theme.label}</span>
                    </span>

                    {/* Verification Status Badge */}
                    <VerificationBadge
                      status={
                        b.verinova_status ||
                        (isFailed ? 'FAILED' : isCancelled ? 'NEEDS_REVIEW' : 'VERIFIED')
                      }
                      onClick={() => setSelectedBookingId(b.id)}
                      showDetailsHint={true}
                    />
                  </div>
                </div>

                {/* Status Notice / Banner (if applicable) */}
                {theme.banner && (
                  <div className={`p-3.5 rounded-2xl border flex items-center space-x-3 text-xs font-semibold ${theme.banner.bg}`}>
                    <theme.banner.icon className="w-4 h-4 shrink-0" />
                    <span>{theme.banner.text}</span>
                  </div>
                )}

                {/* 4 Full Columns Details Grid - In matching color of state */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  {/* Column 1: Stay Property with Photo */}
                  <div className={`p-4 rounded-2xl border ${theme.columnBg} ${theme.columnBorder} transition-all flex items-start space-x-3.5 min-w-0`}>
                    <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs relative group">
                      <img
                        src={propImage}
                        alt={b.property?.name || 'Stay Property'}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80';
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <span className={`font-bold block uppercase tracking-wider text-[10px] ${theme.columnHeaderClass}`}>
                        Stay Property
                      </span>
                      {b.property_id ? (
                        <Link
                          to={`/properties/${b.property_id}`}
                          className={`text-sm block font-sans font-bold truncate hover:underline ${theme.columnValueClass}`}
                          title={b.property?.name || 'Sanctuary'}
                        >
                          {b.property?.name || 'Sanctuary'}
                        </Link>
                      ) : (
                        <strong className={`text-sm block font-sans truncate ${theme.columnValueClass}`}>
                          {b.property?.name || 'Sanctuary'}
                        </strong>
                      )}
                      <span className={`block truncate ${theme.columnSubtextClass}`}>
                        {b.property?.city ? `${b.property.city}, ${b.property.state || ''} • ` : ''}{roomName}
                      </span>
                    </div>
                  </div>

                  {/* Column 2: Stay Dates */}
                  <div className={`p-4 rounded-2xl border ${theme.columnBg} ${theme.columnBorder} space-y-1.5 transition-all`}>
                    <span className={`font-bold block uppercase tracking-wider text-[10px] ${theme.columnHeaderClass}`}>
                      Stay Dates
                    </span>
                    <strong className={`text-sm block font-sans ${theme.columnValueClass}`}>
                      {b.check_in} to {b.check_out}
                    </strong>
                    <span className={`block ${theme.columnSubtextClass}`}>
                      {b.total_nights} Night(s) • {b.total_guests} Guest(s)
                    </span>
                  </div>

                  {/* Column 3: Stay Partner Experience */}
                  <div className={`p-4 rounded-2xl border ${theme.columnBg} ${theme.columnBorder} space-y-1.5 transition-all`}>
                    <span className={`font-bold block uppercase tracking-wider text-[10px] ${theme.columnHeaderClass}`}>
                      Stay Partner Experience
                    </span>
                    {expTitle ? (
                      <>
                        <strong className={`text-sm block font-sans ${theme.priceClass}`}>
                          {expTitle}
                        </strong>
                        <span className={`block ${theme.columnSubtextClass}`}>
                          {b.booking_experiences[0]?.participants || 1} Participant(s)
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-400 italic block mt-1">Accommodation only</span>
                    )}
                  </div>

                  {/* Column 4: Total Amount Paid */}
                  <div className={`p-4 rounded-2xl border ${theme.columnBg} ${theme.columnBorder} space-y-1.5 flex flex-col justify-between transition-all`}>
                    <div>
                      <span className={`font-bold block uppercase tracking-wider text-[10px] ${theme.columnHeaderClass}`}>
                        {isFailed ? 'Payment Status' : 'Total Amount Paid'}
                      </span>
                      <strong className={`text-lg font-serif block font-bold ${theme.priceClass}`}>
                        ₹{(b.original_total_amount || b.total_amount)?.toLocaleString('en-IN')}
                      </strong>
                    </div>

                    {canCancel && (
                      <button
                        type="button"
                        data-testid={`cancel-booking-btn-${b.id}`}
                        onClick={() => setCancellationBooking(b)}
                        className="text-[11px] font-bold text-rose-500 hover:text-rose-600 underline text-left cursor-pointer mt-1"
                      >
                        Cancel Reservation
                      </button>
                    )}

                    {isDeadlinePassed && (
                      <span data-testid={`cancel-disabled-badge-${b.id}`} className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 mt-1 block">
                        Cancellation deadline has passed.
                      </span>
                    )}

                    {isCheckedIn && (
                      <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center space-x-1 mt-1">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Currently Checked In</span>
                      </span>
                    )}

                    {isFailed && (
                      <Link
                        to={`/properties/${b.property_id || ''}`}
                        className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline flex items-center space-x-1 mt-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Retry Sanctuary Booking</span>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Cancelled Refund Card */}
                {isCancelled && (
                  <div data-testid={`refund-card-${b.id}`} className="p-5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 space-y-3">
                    <div className="flex items-center justify-between border-b border-rose-200/60 dark:border-rose-900/40 pb-2">
                      <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-300 font-bold text-xs">
                        <Receipt className="w-4 h-4" />
                        <span>VeriNova Processed Refund Breakdown (Internal Settlement)</span>
                      </div>
                      {(b.refund?.refund_reference || b.verinova_verification_id) && (
                        <span className="font-mono text-xs font-bold text-rose-700 dark:text-rose-300">
                          {b.refund?.refund_reference || b.verinova_verification_id}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-rose-700/80 dark:text-rose-400/80 block text-[10px] uppercase font-bold">Estimated Refund</span>
                        <strong data-testid={`refund-amount-${b.id}`} className="text-base font-serif font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{(b.refund?.refund_amount ?? b.refund_amount ?? b.total_amount)?.toLocaleString('en-IN')}
                        </strong>
                        <span className="text-[10px] text-slate-500 block">
                          ({b.refund?.refund_percentage ?? b.refund_percentage_snapshot ?? 100}% rate applied)
                        </span>
                      </div>

                      <div>
                        <span className="text-rose-700/80 dark:text-rose-400/80 block text-[10px] uppercase font-bold">Retained Amount</span>
                        <span className="text-slate-700 dark:text-slate-300 font-semibold">
                          ₹{(b.refund?.retained_amount ?? b.retained_amount ?? b.refund?.cancellation_fee ?? 0)?.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div>
                        <span className="text-rose-700/80 dark:text-rose-400/80 block text-[10px] uppercase font-bold">Cancellation Status</span>
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">
                          Demo Refund Processed
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Message from Your Host (if not failed) */}
                {!isFailed && (
                  <div className={`p-5 rounded-2xl border ${theme.columnBg} ${theme.columnBorder} space-y-3`}>
                    <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/80 pb-2">
                      <div className={`flex items-center space-x-2 ${theme.columnHeaderClass}`}>
                        <MessageSquare className="w-4 h-4" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#17324D] dark:text-white">
                          Message from Your Stay Partner
                        </h4>
                      </div>
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {b.property?.name || 'Sanctuary'}
                      </span>
                    </div>

                    {b.guest_information_message_snapshot ? (
                      <div className="space-y-3">
                        <p className="text-xs text-[#17324D] dark:text-slate-200 whitespace-pre-line leading-relaxed font-sans bg-white/80 dark:bg-slate-900/70 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          {b.guest_information_message_snapshot}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 pt-1 font-medium">
                          {b.property?.check_in_time && (
                            <span>🕒 Check-in: <strong className="text-slate-700 dark:text-slate-200">{b.property.check_in_time}</strong></span>
                          )}
                          {b.property?.check_out_time && (
                            <span>🕒 Check-out: <strong className="text-slate-700 dark:text-slate-200">{b.property.check_out_time}</strong></span>
                          )}
                          {b.property?.contact_phone && (
                            <span>📞 Property Contact: <strong className="text-slate-700 dark:text-slate-200">+91 {b.property.contact_phone}</strong></span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                        No additional instructions were provided by the stay partner.
                      </p>
                    )}
                  </div>
                )}

                {/* Agreed Home Rules Snapshot */}
                {b.rule_snapshot && !isFailed && (
                  <div className={`p-4 rounded-2xl border ${theme.columnBg} ${theme.columnBorder} space-y-2 text-xs`}>
                    <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/80 pb-1.5">
                      <span className="font-bold text-[#17324D] dark:text-white flex items-center space-x-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#35A66F]" />
                        <span>Agreed Home Rules Snapshot</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Immutable</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-[#607080] dark:text-slate-300 pt-1">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Children</span>
                        <span>{b.rule_snapshot.children_allowed !== false ? 'Children Welcome' : 'Adults Only'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Pets</span>
                        <span>{b.rule_snapshot.pets_allowed ? 'Pets Allowed' : 'No Pets'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Smoking / Parties</span>
                        <span>{b.rule_snapshot.smoking_allowed ? 'Smoking Permitted' : 'Non-Smoking'} • {b.rule_snapshot.parties_allowed ? 'Events OK' : 'No Parties'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Digital Travel Itinerary Timeline - Coordinated with state theme */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${theme.columnHeaderClass}`}>
                      Journey Milestones ({theme.label})
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {isCancelled ? 'Status: Cancelled' : isFailed ? 'Status: Failed' : `Step ${Math.min(theme.milestoneProgress, 7)} of 7`}
                    </span>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 text-center">
                    {timelineSteps.map((step, sIdx) => {
                      const isDone = !isCancelled && !isFailed && step.stepNum <= theme.milestoneProgress;
                      const isCancelledStep = isCancelled && step.stepNum <= 2;
                      const isFailedStep = isFailed && step.stepNum === 1;

                      return (
                        <div key={sIdx} className="space-y-1.5">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              isCancelledStep
                                ? 'bg-rose-400 dark:bg-rose-600'
                                : isFailedStep
                                  ? 'bg-red-500 dark:bg-red-600'
                                  : isDone
                                    ? theme.milestoneActiveBar
                                    : 'bg-slate-200 dark:bg-slate-800'
                            }`}
                          />
                          <span
                            className={`text-[9px] font-bold truncate block ${
                              isCancelledStep
                                ? 'text-rose-500 dark:text-rose-400'
                                : isFailedStep
                                  ? 'text-red-500 dark:text-red-400'
                                  : isDone
                                    ? theme.milestoneActiveText
                                    : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
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

      {reviewBooking && (
        <ReviewModal
          booking={reviewBooking}
          isOpen={!!reviewBooking}
          onClose={() => setReviewBooking(null)}
          onSuccess={fetchBookings}
        />
      )}

      {viewReviewBooking && (
        <ViewReviewModal
          booking={viewReviewBooking}
          review={viewReviewBooking.review}
          isOpen={!!viewReviewBooking}
          onClose={() => setViewReviewBooking(null)}
        />
      )}

      {cancellationBooking && (
        <CancellationModal
          booking={cancellationBooking}
          isOpen={!!cancellationBooking}
          onClose={() => setCancellationBooking(null)}
          onSuccess={() => {
            fetchBookings();
          }}
        />
      )}

      {stayInfoBookingId && (
        <StayInformationModal
          bookingId={stayInfoBookingId}
          isOpen={!!stayInfoBookingId}
          onClose={() => setStayInfoBookingId(null)}
          onOpenMessaging={(b) => {
            setStayInfoBookingId(null);
            setMessagingBooking(b);
          }}
        />
      )}

      {messagingBooking && (
        <BookingMessageModal
          bookingId={messagingBooking.id || messagingBooking.booking_id}
          isOpen={!!messagingBooking}
          onClose={() => setMessagingBooking(null)}
          initialData={{
            property_name: messagingBooking.property?.name,
            booking_number: messagingBooking.booking_number,
            stay_dates: `${messagingBooking.check_in} → ${messagingBooking.check_out}`,
          }}
        />
      )}
    </div>
  );
};
export default MyBookings;
