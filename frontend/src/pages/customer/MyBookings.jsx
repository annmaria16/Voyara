import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { customerApi } from '../../api/customer';
import { VerificationBadge } from '../../components/verification/VerificationBadge';
import { VerificationModal } from '../../components/verification/VerificationModal';
import { Calendar, MapPin, ShieldCheck, AlertCircle, ArrowRight, XCircle, Compass, Sparkles } from 'lucide-react';

export const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(null);
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

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setCancelLoading(bookingId);
    try {
      await customerApi.cancelBooking(bookingId);
      await fetchBookings();
    } catch (err) {
      alert(err.message || 'Could not cancel booking.');
    } finally {
      setCancelLoading(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#F97360]" />
            <span>Verified Travel Bookings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-serif text-[#102A43] dark:text-white tracking-tight">
            My Reservations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-300 mt-1 font-light">
            Manage your past and upcoming stays, local host adventures, and transaction verification audit records.
          </p>
        </div>

        <Link
          to="/search"
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-[#e05e4b] hover:to-orange-600 text-white text-xs font-bold rounded-2xl shadow-md shadow-[#F97360]/20 transition-all cursor-pointer"
        >
          <Compass className="w-4 h-4" />
          <span>Book Another Stay</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center space-x-3 text-rose-700 dark:text-rose-300 text-xs font-bold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Retrieving your bookings from database...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-12 sm:p-16 text-center border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold font-serif text-[#102A43] dark:text-white">No bookings found</h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
            You haven't made any reservations yet. Start your journey by exploring our handpicked hill-station stays and seaside retreats.
          </p>
          <Link
            to="/search"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-[#e05e4b] hover:to-orange-600 text-white font-bold rounded-2xl text-xs shadow-md shadow-[#F97360]/20 transition-all cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>Explore Stays & Sanctuaries</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {bookings.map((b) => {
            const isCancelled = b.status === 'CANCELLED';
            const roomName = b.booking_rooms?.[0]?.room_name || 'Room Stay';
            const expTitle = b.booking_experiences?.[0]?.experience_title;

            return (
              <div
                key={b.id}
                className="bg-white dark:bg-[#131D2E] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow space-y-6"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono uppercase bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold px-3 py-1 rounded-xl shadow-xs">
                      {b.booking_number}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Booked on {new Date(b.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        isCancelled
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {b.status}
                    </span>

                    <VerificationBadge
                      status={b.status === 'CANCELLED' ? 'NEEDS_REVIEW' : 'VERIFIED'}
                      onClick={() => setSelectedBookingId(b.id)}
                      showDetailsHint={true}
                    />
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  <div className="p-4 bg-[#FFF8F0]/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                    <span className="text-slate-400 dark:text-slate-400 font-bold block uppercase tracking-wider text-[10px]">
                      Stay Property
                    </span>
                    <strong className="text-[#102A43] dark:text-white text-sm block font-sans">
                      {b.property?.name || 'Sanctuary'}
                    </strong>
                    <span className="text-slate-600 dark:text-slate-300 block">{roomName}</span>
                  </div>

                  <div className="p-4 bg-[#FFF8F0]/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                    <span className="text-slate-400 dark:text-slate-400 font-bold block uppercase tracking-wider text-[10px]">
                      Stay Dates
                    </span>
                    <strong className="text-[#102A43] dark:text-white text-sm block font-sans">
                      {b.check_in} to {b.check_out}
                    </strong>
                    <span className="text-slate-600 dark:text-slate-300 block">
                      {b.total_nights} Night(s) • {b.total_guests} Guest(s)
                    </span>
                  </div>

                  <div className="p-4 bg-[#FFF8F0]/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                    <span className="text-slate-400 dark:text-slate-400 font-bold block uppercase tracking-wider text-[10px]">
                      Host Experience
                    </span>
                    {expTitle ? (
                      <>
                        <strong className="text-emerald-600 dark:text-emerald-400 text-sm block font-sans">
                          {expTitle}
                        </strong>
                        <span className="text-slate-600 dark:text-slate-300 block">
                          {b.booking_experiences[0]?.participants || 1} Participant(s)
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-400 italic block mt-1">Accommodation only</span>
                    )}
                  </div>

                  <div className="p-4 bg-[#FFF8F0]/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1 flex flex-col justify-between">
                    <div>
                      <span className="text-slate-400 dark:text-slate-400 font-bold block uppercase tracking-wider text-[10px]">
                        Total Amount
                      </span>
                      <strong className="text-[#F97360] text-lg font-serif block font-bold">
                        ₹{b.total_amount?.toLocaleString('en-IN')}
                      </strong>
                    </div>

                    {!isCancelled && (
                      <button
                        onClick={() => handleCancel(b.id)}
                        disabled={cancelLoading === b.id}
                        className="text-[11px] font-bold text-rose-500 hover:text-rose-600 underline text-left cursor-pointer disabled:opacity-50"
                      >
                        {cancelLoading === b.id ? 'Cancelling...' : 'Cancel Reservation'}
                      </button>
                    )}
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
    </div>
  );
};
