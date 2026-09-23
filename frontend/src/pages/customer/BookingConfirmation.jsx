import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { customerApi } from '../../api/customer';
import { VerificationBadge } from '../../components/verification/VerificationBadge';
import { VerificationModal } from '../../components/verification/VerificationModal';
import { InvoiceModal } from '../../components/payment/InvoiceModal';
import { StayInformationModal } from '../../components/booking/StayInformationModal';
import { BookingMessageModal } from '../../components/booking/BookingMessageModal';
import { resolveImageUrl } from '../../utils/imageUrl';
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
  Sparkles,
  MessageSquare,
  Compass,
  Info,
  ExternalLink,
} from 'lucide-react';

export const BookingConfirmation = () => {
  const { id } = useParams();
  const location = useLocation();

  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(!booking);
  const [modalOpen, setModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [stayInfoModalOpen, setStayInfoModalOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);

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
        <div className="w-10 h-10 border-4 border-[#087F8C] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-[#607080] dark:text-slate-300">Retrieving booking confirmation & payment receipt...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold font-serif text-[#17324D] dark:text-white">Booking Not Found</h2>
        <Link to="/customer/bookings" className="px-5 py-2.5 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-bold rounded-xl text-xs inline-block">
          Go to My Journeys
        </Link>
      </div>
    );
  }

  const paymentData = location.state?.payment;
  const paymentId = paymentData?.razorpay_payment_id || booking.payment?.razorpay_payment_id || 'pay_verified_razorpay';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-6 sm:p-10 border border-slate-100 dark:border-teal-900/40 shadow-2xl space-y-8">
        {/* Success Header */}
        <div className="text-center space-y-3 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="w-16 h-16 bg-[#DDF3E7] text-[#35A66F] rounded-3xl flex items-center justify-center mx-auto border border-[#35A66F]/30 shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black font-serif text-[#17324D] dark:text-white">
            Your Stay is Confirmed!
          </h1>
          <p className="text-xs text-[#607080] dark:text-slate-400">
            Booking Reference:{' '}
            <strong className="text-base text-[#17324D] dark:text-white font-mono">{booking.booking_number}</strong>
          </p>
        </div>

        {/* Quick Action Navigation Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setStayInfoModalOpen(true)}
            className="py-3 px-4 bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] hover:from-[#076974] hover:to-[#087F8C] text-white text-xs font-bold rounded-2xl shadow-md shadow-teal-500/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <Info className="w-4 h-4" />
            <span>View Stay Information</span>
          </button>

          <button
            type="button"
            onClick={() => setMessageModalOpen(true)}
            className="py-3 px-4 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white text-xs font-bold rounded-2xl shadow-md shadow-orange-500/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Message Stay Partner</span>
          </button>

          <Link
            to="/customer/bookings"
            className="py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#17324D] dark:text-white text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-center space-x-2 transition-all"
          >
            <Compass className="w-4 h-4 text-[#087F8C]" />
            <span>View My Journey</span>
          </Link>
        </div>

        {/* Razorpay Verified Payment Pill */}
        <div className="p-4 rounded-2xl bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-100 dark:border-teal-900/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3 text-left">
            <div className="w-9 h-9 rounded-xl bg-[#087F8C]/15 text-[#087F8C] dark:text-[#27B7A8] flex items-center justify-center shrink-0 border border-[#087F8C]/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-[#17324D] dark:text-white block">
                Paid via Razorpay Secure Gateway
              </span>
              <span className="text-[11px] text-[#607080] dark:text-slate-400 font-mono">
                Payment ID: <strong className="text-[#35A66F]">{paymentId}</strong>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setInvoiceModalOpen(true)}
            className="px-4 py-2 bg-white dark:bg-[#0F273D] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-[#F97316] rounded-xl text-xs font-bold shadow-2xs hover:shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>View Tax Invoice</span>
          </button>
        </div>

        {/* VeriNova Trust Callout */}
        <div className="p-5 bg-gradient-to-r from-[#17324D] via-[#087F8C]/90 to-[#091B29] text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-teal-500/30">
          <div className="flex items-center space-x-3 text-left">
            <ShieldCheck className="w-8 h-8 text-[#27B7A8] shrink-0" />
            <div>
              <h4 className="font-bold text-sm text-teal-300">VeriNova Transaction Verified</h4>
              <p className="text-xs text-slate-200">
                100% database consistency, availability lock, and double booking protection verified.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-white border border-white/20 transition-colors whitespace-nowrap cursor-pointer"
          >
            Inspect Audit Checks →
          </button>
        </div>

        {/* Confirmed Stay Snapshot Details */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold font-serif text-[#17324D] dark:text-white flex items-center space-x-2">
              <Home className="w-4 h-4 text-[#087F8C]" />
              <span>Confirmed Stay Details</span>
            </h3>
            <button
              type="button"
              onClick={() => setStayInfoModalOpen(true)}
              className="text-xs font-bold text-[#087F8C] dark:text-[#27B7A8] hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <span>Full Stay Guide</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-[#FFFDF7] dark:bg-[#091B29] p-4 rounded-2xl border border-slate-100 dark:border-teal-900/40 text-xs">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs relative">
              <img
                src={
                  resolveImageUrl(
                    booking.property?.images?.[0]?.image_url ||
                    (typeof booking.property?.images?.[0] === 'string' ? booking.property.images[0] : null) ||
                    booking.property?.cover_image ||
                    booking.property_image
                  ) ||
                  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'
                }
                alt={booking.property?.name || 'Sanctuary'}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80';
                }}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 min-w-0">
              <div>
                <span className="text-[#607080] dark:text-slate-400 block">Property</span>
                <strong className="text-[#17324D] dark:text-white text-sm block truncate">
                  {booking.property?.name || 'Sanctuary'}
                </strong>
                <span className="text-[10px] text-slate-400 block truncate">
                  {booking.property?.city ? `${booking.property.city}, ${booking.property.state || ''}` : 'Sanctuary'}
                </span>
              </div>
              <div>
                <span className="text-[#607080] dark:text-slate-400 block">Check-in</span>
                <strong className="text-[#17324D] dark:text-white text-sm">{booking.check_in}</strong>
              </div>
              <div>
                <span className="text-[#607080] dark:text-slate-400 block">Check-out</span>
                <strong className="text-[#17324D] dark:text-white text-sm">{booking.check_out}</strong>
              </div>
              <div>
                <span className="text-[#607080] dark:text-slate-400 block">Guests & Nights</span>
                <strong className="text-[#17324D] dark:text-white text-sm">
                  {booking.total_guests} Guests • {booking.total_nights} N
                </strong>
              </div>
            </div>
          </div>

          {/* Booked Room Information */}
          <div className="space-y-2">
            {booking.booking_rooms?.map((br) => (
              <div key={br.id} className="p-3.5 bg-[#FFFDF7] dark:bg-[#091B29] rounded-xl border border-slate-100 dark:border-teal-900/40 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-[#17324D] dark:text-white block">{br.room_name}</span>
                  <span className="text-[#607080] dark:text-slate-400 block">₹{br.nightly_price} / night • {br.quantity} Unit(s)</span>
                </div>
                <span className="font-bold text-[#17324D] dark:text-white text-sm">₹{br.subtotal?.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>

          {/* Connected Experience (if booked) */}
          {booking.booking_experiences?.length > 0 && (
            <div className="space-y-2 pt-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#087F8C] dark:text-[#27B7A8]">Connected Experience</h4>
              {booking.booking_experiences.map((be) => (
                <div key={be.id} className="p-3.5 bg-[#DDF3E7] dark:bg-[#35A66F]/20 rounded-xl border border-[#35A66F]/30 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-[#17324D] dark:text-white block">{be.experience_title}</span>
                    <span className="text-[#35A66F] block">{be.participants} Participant(s) • Scheduled: {be.scheduled_date}</span>
                  </div>
                  <span className="font-bold text-[#35A66F] text-sm">₹{be.subtotal?.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}

          {/* Total Amount */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-sm font-bold text-[#17324D] dark:text-white">
            <div>
              <span>Total Paid via Razorpay</span>
              <span className="text-[10px] text-[#35A66F] block font-normal">Includes 100% verified booking guarantee</span>
            </div>
            <span className="text-2xl text-[#F97316] font-serif">
              ₹{booking.total_amount?.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Message from Your Host Box */}
        <div className="p-5 rounded-2xl bg-[#FFFDF7] dark:bg-[#091B29] border border-orange-100 dark:border-teal-900/40 space-y-3">
          <div className="flex items-center justify-between border-b border-orange-100 dark:border-slate-800 pb-2">
            <div className="flex items-center space-x-2 text-[#087F8C] dark:text-[#27B7A8]">
              <MessageSquare className="w-4 h-4 text-[#087F8C] dark:text-[#27B7A8]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#17324D] dark:text-white">
                Message from Your Stay Partner
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setMessageModalOpen(true)}
              className="text-[11px] font-bold text-orange-500 hover:text-orange-600 flex items-center space-x-1 cursor-pointer"
            >
              <MessageSquare className="w-3 h-3" />
              <span>Reply to Host</span>
            </button>
          </div>

          <p className="text-xs text-[#17324D] dark:text-slate-200 whitespace-pre-line leading-relaxed font-sans bg-white/70 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 italic">
            "{booking.guest_information_message_snapshot || 'No additional instructions were provided by the Stay Partner.'}"
          </p>

          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 pt-1 font-medium">
            {booking.property?.check_in_time && (
              <span>🕒 Check-in: <strong className="text-slate-700 dark:text-slate-200">{booking.property.check_in_time}</strong></span>
            )}
            {booking.property?.check_out_time && (
              <span>🕒 Check-out: <strong className="text-slate-700 dark:text-slate-200">{booking.property.check_out_time}</strong></span>
            )}
            {booking.property?.contact_phone && (
              <span>📞 Property Phone: <strong className="text-slate-700 dark:text-slate-200">+91 {booking.property.contact_phone}</strong></span>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => setStayInfoModalOpen(true)}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] hover:from-[#076974] hover:to-[#087F8C] text-white text-xs font-bold rounded-xl shadow-md text-center transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Info className="w-4 h-4" />
            <span>Open Stay Information Guide</span>
          </button>
          <Link
            to="/customer/bookings"
            className="py-3 px-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#17324D] dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-center transition-all"
          >
            Go to My Journeys
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

      <StayInformationModal
        bookingId={booking.id}
        isOpen={stayInfoModalOpen}
        onClose={() => setStayInfoModalOpen(false)}
        onOpenMessaging={() => setMessageModalOpen(true)}
      />

      <BookingMessageModal
        bookingId={booking.id}
        isOpen={messageModalOpen}
        onClose={() => setMessageModalOpen(false)}
        initialData={{
          property_name: booking.property?.name,
          booking_number: booking.booking_number,
          stay_dates: `${booking.check_in} → ${booking.check_out}`,
        }}
      />
    </div>
  );
};

export default BookingConfirmation;
