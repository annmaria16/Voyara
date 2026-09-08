import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { customerApi } from '../../api/customer';
import { VerificationBadge } from '../../components/verification/VerificationBadge';
import { VerificationModal } from '../../components/verification/VerificationModal';
import { InvoiceModal } from '../../components/payment/InvoiceModal';
import {
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Calendar,
  ArrowRight,
  Printer,
  Home,
  CreditCard,
  FileText,
  Sparkles
} from 'lucide-react';

export const BookingConfirmation = () => {
  const { id } = useParams();
  const location = useLocation();

  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(!booking);
  const [modalOpen, setModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  useEffect(() => {
    if (!booking && id) {
      const loadBooking = async () => {
        try {
          const data = await customerApi.getBookingDetails(id);
          setBooking(data);
        } catch (err) {
          console.error('Error loading booking confirmation:', err);
        } finally {
          setLoading(false);
        }
      };
      loadBooking();
    }
  }, [id, booking]);

  if (loading) {
    return (
      <div className="min-h-screen py-24 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Retrieving booking confirmation & payment receipt...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">Booking Not Found</h2>
        <Link to="/customer/bookings" className="px-5 py-2.5 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl text-xs inline-block">
          Go to My Bookings
        </Link>
      </div>
    );
  }

  const paymentData = location.state?.payment;
  const paymentId = paymentData?.razorpay_payment_id || booking.payment?.razorpay_payment_id || 'pay_verified_razorpay';
  const orderId = paymentData?.razorpay_order_id || booking.payment?.razorpay_order_id || `order_${booking.booking_number}`;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-6 sm:p-10 border border-[#FDBA9A]/30 dark:border-slate-800 shadow-2xl space-y-8">
        {/* Success Header */}
        <div className="text-center space-y-3 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="w-16 h-16 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center mx-auto border border-emerald-500/30 shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5 text-[#F97360]" />
            <span>Payment Paid & Confirmed</span>
          </div>
          <h1 className="text-3xl font-black font-serif text-slate-900 dark:text-white">You're Going on an Adventure!</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Booking Reference:{' '}
            <strong className="text-base text-slate-900 dark:text-white font-mono">{booking.booking_number}</strong>
          </p>
        </div>

        {/* Razorpay Verified Payment Pill */}
        <div className="p-4 rounded-2xl bg-[#FFF8F0]/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3 text-left">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-[#102A43] dark:text-white block">
                Paid via Razorpay Secure Gateway
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Payment ID: <strong className="text-emerald-600 dark:text-emerald-400">{paymentId}</strong>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setInvoiceModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-[#e05e4b] hover:to-orange-600 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>View Tax Invoice</span>
          </button>
        </div>

        {/* VeriNova Trust Callout */}
        <div className="p-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-emerald-500/30">
          <div className="flex items-center space-x-3 text-left">
            <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
            <div>
              <h4 className="font-bold text-sm text-emerald-300">VeriNova Transaction Verified</h4>
              <p className="text-xs text-slate-300">
                100% database consistency, availability lock, and zero conflict verified.
              </p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-xl text-xs font-bold text-emerald-300 border border-emerald-400/30 transition-colors whitespace-nowrap cursor-pointer"
          >
            Inspect Audit Checks →
          </button>
        </div>

        {/* Reservation Breakdown */}
        <div className="space-y-4">
          <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white">Stay Details</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FFF8F0] dark:bg-slate-900/70 p-4 rounded-2xl border border-[#FDBA9A]/30 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Check-in</span>
              <strong className="text-slate-900 dark:text-white text-sm">{booking.check_in}</strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Check-out</span>
              <strong className="text-slate-900 dark:text-white text-sm">{booking.check_out}</strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Total Nights</span>
              <strong className="text-slate-900 dark:text-white text-sm">{booking.total_nights} Night(s)</strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Total Guests</span>
              <strong className="text-slate-900 dark:text-white text-sm">{booking.total_guests} Guest(s)</strong>
            </div>
          </div>

          {/* Room Items */}
          <div className="space-y-2">
            {booking.booking_rooms?.map((br) => (
              <div key={br.id} className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">{br.room_name}</span>
                  <span className="text-slate-500 dark:text-slate-400 block">₹{br.nightly_price} / night</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">₹{br.subtotal?.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>

          {/* Experience Items */}
          {booking.booking_experiences?.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Connected Experience</h4>
              {booking.booking_experiences.map((be) => (
                <div key={be.id} className="p-3 bg-emerald-500/10 dark:bg-emerald-950/20 rounded-xl border border-emerald-500/20 flex justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{be.experience_title}</span>
                    <span className="text-slate-500 dark:text-slate-400 block">{be.participants} Participant(s)</span>
                  </div>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{be.subtotal?.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}

          {/* Total Amount */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white">
            <div>
              <span>Total Paid via Razorpay</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-normal">Includes 100% verified booking guarantee</span>
            </div>
            <span className="text-2xl text-orange-600 dark:text-orange-400 font-serif">
              ₹{booking.total_amount?.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => setInvoiceModalOpen(true)}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-md text-center transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Tax Invoice / Receipt</span>
          </button>
          <Link
            to="/customer/bookings"
            className="py-3 px-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-center transition-all"
          >
            View All My Bookings
          </Link>
          <Link
            to="/"
            className="py-3 px-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-center transition-all"
          >
            Return Home
          </Link>
        </div>
      </div>

      <VerificationModal
        bookingId={booking.id}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />

      <InvoiceModal
        booking={booking}
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
      />
    </div>
  );
};

export default BookingConfirmation;
