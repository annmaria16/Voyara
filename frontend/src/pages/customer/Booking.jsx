import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { customerApi } from '../../api/customer';
import { useAuth } from '../../context/AuthContext';
import { VerificationBadge } from '../../components/verification/VerificationBadge';
import {
  ShieldCheck,
  Calendar,
  Users,
  Building,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Lock,
  ArrowLeft
} from 'lucide-react';

export const BookingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const bookingState = location.state;

  const [customerNotes, setCustomerNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!bookingState) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold font-serif text-[#102A43] dark:text-white">No Booking Selected</h2>
        <p className="text-sm text-slate-500 dark:text-slate-300">Please choose a stay and room unit first.</p>
        <Link to="/search" className="inline-block px-5 py-2.5 bg-gradient-to-r from-[#F97360] to-orange-500 text-white font-bold rounded-xl text-xs">
          Browse Stays
        </Link>
      </div>
    );
  }

  const {
    property_id,
    property_name,
    property_type,
    property_city,
    room_id,
    room_name,
    room_price,
    check_in,
    check_out,
    nights,
    guests,
    room_subtotal,
    experience_id,
    experience_title,
    experience_price,
    experience_pricing_model,
    experience_participants,
    experience_subtotal,
    total_amount,
  } = bookingState;

  const handleConfirmReservation = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        property_id,
        room_id,
        check_in,
        check_out,
        total_guests: guests,
        experience_id: experience_id || undefined,
        experience_participants: experience_participants || undefined,
        customer_notes: customerNotes.trim() || undefined,
      };

      const response = await customerApi.createBooking(payload);

      // Navigate to confirmation page with booking data
      navigate(`/booking/confirmation/${response.id}`, { state: { booking: response } });
    } catch (err) {
      setError(err.message || 'Booking reservation could not be completed. Please check availability.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to stay details</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs bg-gradient-to-r from-[#F97360] to-orange-500 text-white font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
              Step 2 of 2
            </span>
            <VerificationBadge status="VERIFIED" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-serif text-[#102A43] dark:text-white">
            Review & Confirm Your Reservation
          </h1>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center space-x-3 text-rose-700 dark:text-rose-300 text-xs font-bold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleConfirmReservation} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Guest info & Notes */}
        <div className="lg:col-span-7 space-y-6">
          {/* Guest Identity Card */}
          <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <h2 className="text-base sm:text-lg font-bold font-serif text-[#102A43] dark:text-white flex items-center space-x-2">
              <Users className="w-5 h-5 text-emerald-500" />
              <span>Guest Information</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-[#FFF8F0]/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Primary Guest</span>
                <strong className="text-[#102A43] dark:text-white text-sm block">{user?.name || 'Voyara Traveler'}</strong>
              </div>

              <div className="p-3.5 bg-[#FFF8F0]/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Contact Phone</span>
                <strong className="text-[#102A43] dark:text-white text-sm block">{user?.phone || 'Verified'}</strong>
              </div>

              <div className="p-3.5 bg-[#FFF8F0]/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200/70 dark:border-slate-800 sm:col-span-2">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Contact Email</span>
                <strong className="text-[#102A43] dark:text-white text-sm block">{user?.email}</strong>
              </div>
            </div>
          </div>

          {/* Special Requests */}
          <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <h2 className="text-base sm:text-lg font-bold font-serif text-[#102A43] dark:text-white">
              Special Requests / Host Notes
            </h2>
            <textarea
              rows={3}
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="e.g. Late check-in arrival around 6 PM, dietary preference for breakfast..."
              className="w-full px-4 py-3 rounded-2xl bg-[#FFF8F0]/50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs text-[#102A43] dark:text-white focus:outline-hidden focus:border-[#F97360] resize-none"
            />
          </div>
        </div>

        {/* Right Column: Reservation Breakdown */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6">
            <h2 className="text-base sm:text-lg font-bold font-serif text-[#102A43] dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Reservation Summary
            </h2>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#FFF8F0]/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200/70 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">{property_type}</span>
                <h4 className="text-sm font-bold text-[#102A43] dark:text-white">{property_name}</h4>
                <p className="text-slate-500 dark:text-slate-400">{property_city} • {room_name}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-[#FFF8F0]/70 dark:bg-slate-900/60 rounded-xl border border-slate-200/70 dark:border-slate-800">
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Check-in</span>
                  <strong className="text-[#102A43] dark:text-white">{check_in}</strong>
                </div>
                <div className="p-3 bg-[#FFF8F0]/70 dark:bg-slate-900/60 rounded-xl border border-slate-200/70 dark:border-slate-800">
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Check-out</span>
                  <strong className="text-[#102A43] dark:text-white">{check_out}</strong>
                </div>
              </div>

              {experience_title && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-0.5">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">Bundled Experience</span>
                  <h5 className="font-bold text-emerald-900 dark:text-emerald-300">{experience_title}</h5>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">{experience_participants} participant(s)</p>
                </div>
              )}
            </div>

            {/* Price Calculations */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>{room_name} × {nights} night(s)</span>
                <span className="font-bold text-[#102A43] dark:text-white">₹{room_subtotal.toLocaleString('en-IN')}</span>
              </div>

              {experience_title && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Experience Add-on</span>
                  <span className="font-bold">₹{experience_subtotal.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between text-sm font-bold text-[#102A43] dark:text-white">
                <span>Total Amount Due</span>
                <span className="text-xl text-[#F97360] font-serif font-black">₹{total_amount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-[#e05e4b] hover:to-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-[#F97360]/20 hover:shadow-xl transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying & Securing...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Confirm & Lock Reservation</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default BookingPage;
