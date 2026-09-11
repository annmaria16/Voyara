import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { customerApi } from '../../api/customer';
import { VerificationBadge } from '../../components/verification/VerificationBadge';
import { VerificationModal } from '../../components/verification/VerificationModal';
import { InvoiceModal } from '../../components/payment/InvoiceModal';
import { ReviewModal } from '../../components/review/ReviewModal';
import { CancellationModal } from '../../components/booking/CancellationModal';
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
} from 'lucide-react';

export const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL', 'UPCOMING', 'CHECKED_IN', 'COMPLETED', 'CANCELLED'
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [invoiceBooking, setInvoiceBooking] = useState(null);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [cancellationBooking, setCancellationBooking] = useState(null);
  const [error, setError] = useState('');

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await customerApi.getMyBookings();
      setBookings(data);
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
    if (activeTab === 'CANCELLED') return b.status === 'CANCELLED';
    if (activeTab === 'CHECKED_IN') return b.status === 'CHECKED_IN';
    if (activeTab === 'COMPLETED') return b.status === 'COMPLETED';
    if (activeTab === 'UPCOMING') return (b.status === 'CONFIRMED' || b.status === 'VERIFIED' || b.status === 'PENDING');
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#087F8C]/10 text-[#087F8C] dark:text-[#27B7A8] text-xs font-bold mb-2 border border-[#087F8C]/20">
            <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
            <span>Voyara Digital Travel Journal</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black font-serif text-[#17324D] dark:text-white tracking-tight">
            My Journeys
          </h1>
          <p className="text-xs sm:text-sm text-[#607080] dark:text-slate-300 mt-1 font-light">
            Manage your past and upcoming stays, download GST tax receipts, and view VeriNova audit records.
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
          { key: 'UPCOMING', label: `Upcoming (${bookings.filter(b => ['CONFIRMED', 'VERIFIED', 'PENDING'].includes(b.status)).length})` },
          { key: 'CHECKED_IN', label: `Checked-In (${bookings.filter(b => b.status === 'CHECKED_IN').length})` },
          { key: 'COMPLETED', label: `Completed (${bookings.filter(b => b.status === 'COMPLETED').length})` },
          { key: 'CANCELLED', label: `Cancelled (${bookings.filter(b => b.status === 'CANCELLED').length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === tab.key
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
              ? 'No Cancelled Bookings'
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
            const isCancelled = b.status === 'CANCELLED';
            const isCheckedIn = b.status === 'CHECKED_IN';
            const isCompleted = b.status === 'COMPLETED';
            const canCancel = ['CONFIRMED', 'VERIFIED', 'PENDING'].includes(b.status);
            const roomName = b.booking_rooms?.[0]?.room_name || 'Room Stay';
            const expTitle = b.booking_experiences?.[0]?.experience_title;

            // Timeline steps based on authoritative booking status
            const timelineSteps = [
              { label: 'Booked', done: true },
              { label: 'Verified', done: true },
              { label: 'Confirmed', done: !isCancelled },
              { label: 'Checked-In', done: !isCancelled && (isCheckedIn || isCompleted) },
              { label: 'Stay', done: !isCancelled && (isCheckedIn || isCompleted) },
              { label: 'Checkout', done: !isCancelled && isCompleted },
              { label: 'Review', done: !isCancelled && (!!b.review || isCompleted) },
            ];

            return (
              <div
                key={b.id}
                className="card-voyara rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-teal-900/40 shadow-sm hover:shadow-md transition-shadow space-y-6 bg-white dark:bg-[#0F273D]"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                    <span className="text-xs font-mono uppercase bg-gradient-to-r from-[#087F8C] to-[#17324D] text-white font-bold px-3 py-1 rounded-xl shadow-xs">
                      {b.booking_number}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#087F8C] dark:text-[#27B7A8] bg-[#087F8C]/10 px-2.5 py-1 rounded-xl border border-[#087F8C]/20">
                      {b.verinova_verification_id || `VN-TX-${String(b.id).padStart(8, '0')}`}
                    </span>
                    <span className="text-xs text-[#607080] dark:text-slate-400">
                      Booked on {new Date(b.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                      <CreditCard className="w-3 h-3" />
                      <span>Razorpay Verified</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                    {/* Review Button if completed */}
                    {isCompleted && (
                      b.review ? (
                        <span className="inline-flex items-center space-x-1 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-bold border border-amber-500/20">
                          <Star className="w-3.5 h-3.5 fill-[#F6C945] text-[#F6C945]" />
                          <span>Rated {b.review.rating}/5</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setReviewBooking({ ...b, booking_id: b.id, property_name: b.property?.name })}
                          className="px-3 py-1 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1 cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5 fill-white" />
                          <span>Rate Stay</span>
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      onClick={() => setInvoiceBooking(b)}
                      className="px-3 py-1 bg-[#FFFDF7] dark:bg-[#091B29] hover:bg-orange-50 dark:hover:bg-slate-800 text-[#F97316] border border-orange-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Invoice</span>
                    </button>

                    {/* Status Badge */}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        isCancelled
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          : isCheckedIn
                          ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                          : isCompleted
                          ? 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20'
                          : 'bg-[#DDF3E7] text-[#35A66F] dark:bg-[#35A66F]/20 dark:text-[#35A66F] border border-[#35A66F]/30'
                      }`}
                    >
                      {b.status === 'CHECKED_IN' ? 'CHECKED IN' : b.status}
                    </span>

                    <VerificationBadge
                      status={isCancelled ? 'NEEDS_REVIEW' : 'VERIFIED'}
                      onClick={() => setSelectedBookingId(b.id)}
                      showDetailsHint={true}
                    />
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  <div className="p-4 bg-[#FFFDF7] dark:bg-[#091B29] rounded-2xl border border-slate-100 dark:border-teal-900/40 space-y-1">
                    <span className="text-slate-400 dark:text-slate-400 font-bold block uppercase tracking-wider text-[10px]">
                      Stay Property
                    </span>
                    <strong className="text-[#17324D] dark:text-white text-sm block font-sans">
                      {b.property?.name || 'Sanctuary'}
                    </strong>
                    <span className="text-[#607080] dark:text-slate-300 block">{roomName}</span>
                  </div>

                  <div className="p-4 bg-[#FFFDF7] dark:bg-[#091B29] rounded-2xl border border-slate-100 dark:border-teal-900/40 space-y-1">
                    <span className="text-slate-400 dark:text-slate-400 font-bold block uppercase tracking-wider text-[10px]">
                      Stay Dates
                    </span>
                    <strong className="text-[#17324D] dark:text-white text-sm block font-sans">
                      {b.check_in} to {b.check_out}
                    </strong>
                    <span className="text-[#607080] dark:text-slate-300 block">
                      {b.total_nights} Night(s) • {b.total_guests} Guest(s)
                    </span>
                  </div>

                  <div className="p-4 bg-[#FFFDF7] dark:bg-[#091B29] rounded-2xl border border-slate-100 dark:border-teal-900/40 space-y-1">
                    <span className="text-slate-400 dark:text-slate-400 font-bold block uppercase tracking-wider text-[10px]">
                      Stay Partner Experience
                    </span>
                    {expTitle ? (
                      <>
                        <strong className="text-[#087F8C] dark:text-[#27B7A8] text-sm block font-sans">
                          {expTitle}
                        </strong>
                        <span className="text-[#607080] dark:text-slate-300 block">
                          {b.booking_experiences[0]?.participants || 1} Participant(s)
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-400 italic block mt-1">Accommodation only</span>
                    )}
                  </div>

                  <div className="p-4 bg-[#FFFDF7] dark:bg-[#091B29] rounded-2xl border border-slate-100 dark:border-teal-900/40 space-y-1 flex flex-col justify-between">
                    <div>
                      <span className="text-slate-400 dark:text-slate-400 font-bold block uppercase tracking-wider text-[10px]">
                        Total Amount Paid
                      </span>
                      <strong className="text-[#F97316] text-lg font-serif block font-bold">
                        ₹{b.total_amount?.toLocaleString('en-IN')}
                      </strong>
                    </div>

                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => setCancellationBooking(b)}
                        className="text-[11px] font-bold text-rose-500 hover:text-rose-600 underline text-left cursor-pointer mt-1"
                      >
                        Cancel Reservation
                      </button>
                    )}

                    {isCheckedIn && (
                      <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center space-x-1 mt-1">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Currently Checked In</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Cancelled Refund Card */}
                {isCancelled && (
                  <div className="p-5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 space-y-3">
                    <div className="flex items-center justify-between border-b border-rose-200/60 dark:border-rose-900/40 pb-2">
                      <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-400 font-bold text-xs">
                        <Receipt className="w-4 h-4" />
                        <span>VeriNova Processed Refund Breakdown</span>
                      </div>
                      {b.refund?.refund_reference && (
                        <span className="font-mono text-xs font-bold text-rose-700 dark:text-rose-300">
                          {b.refund.refund_reference}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Refund Amount</span>
                        <strong className="text-base font-serif font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{(b.refund?.refund_amount ?? b.total_amount)?.toLocaleString('en-IN')}
                        </strong>
                        <span className="text-[10px] text-slate-500 block">
                          ({b.refund?.refund_percentage ?? 100}% rate applied)
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Cancellation Fee</span>
                        <span className="text-slate-700 dark:text-slate-300 font-semibold">
                          ₹{(b.refund?.cancellation_fee ?? 0)?.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Cancellation Reason</span>
                        <span className="text-slate-700 dark:text-slate-300 italic">
                          {b.cancellation_reason || 'Traveler cancellation'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Message from Your Host */}
                <div className="p-5 rounded-2xl bg-[#FFFDF7] dark:bg-[#091B29] border border-orange-100 dark:border-teal-900/40 space-y-3">
                  <div className="flex items-center justify-between border-b border-orange-100 dark:border-slate-800 pb-2">
                    <div className="flex items-center space-x-2 text-[#087F8C] dark:text-[#27B7A8]">
                      <Sparkles className="w-4 h-4 text-[#F97316]" />
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
                      <p className="text-xs text-[#17324D] dark:text-slate-200 whitespace-pre-line leading-relaxed font-sans bg-white/70 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
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

                {/* Digital Travel Itinerary Timeline */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Journey Milestones
                  </span>
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {timelineSteps.map((step, sIdx) => (
                      <div key={sIdx} className="space-y-1">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            isCancelled
                              ? 'bg-rose-200 dark:bg-rose-950'
                              : step.done
                              ? 'bg-[#087F8C] dark:bg-[#27B7A8]'
                              : 'bg-slate-200 dark:bg-slate-800'
                          }`}
                        />
                        <span
                          className={`text-[9px] font-bold truncate block ${
                            isCancelled
                              ? 'text-slate-400'
                              : step.done
                              ? 'text-[#087F8C] dark:text-[#27B7A8]'
                              : 'text-slate-400'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    ))}
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
    </div>
  );
};

export default MyBookings;
