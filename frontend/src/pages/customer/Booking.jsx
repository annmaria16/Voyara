import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { customerApi } from '../../api/customer';
import { useAuth } from '../../context/AuthContext';
import { loadRazorpayScript } from '../../utils/razorpay';
import { VerificationBadge } from '../../components/verification/VerificationBadge';
import { VoyaraAIChat } from '../../components/ai/VoyaraAIChat';
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
  ArrowLeft,
  CreditCard,
  Zap,
  Info
} from 'lucide-react';

export const BookingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const bookingState = location.state;

  const [customerNotes, setCustomerNotes] = useState('');
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [error, setError] = useState('');
  const [paymentWarning, setPaymentWarning] = useState('');

  if (!bookingState) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold font-serif text-[#17324D] dark:text-white">No Booking Selected</h2>
        <p className="text-sm text-[#607080] dark:text-slate-300">Please choose a stay and room unit first.</p>
        <Link to="/search" className="inline-block px-5 py-2.5 bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white font-bold rounded-xl text-xs">
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
    room_quantity = 1,
    check_in,
    check_out,
    nights,
    guests,
    adults = 2,
    children = 0,
    child_ages = [],
    cot_count = 0,
    extra_bed_count = 0,
    cots_subtotal = 0,
    extra_beds_subtotal = 0,
    children_subtotal = 0,
    room_subtotal,
    experience_id,
    experience_title,
    experience_price,
    experience_pricing_model,
    experience_participants,
    experience_subtotal,
    total_amount,
    property_rules,
    room_rules,
  } = bookingState;

  const handleRazorpayPayment = async (e) => {
    e.preventDefault();
    setError('');
    setPaymentWarning('');

    if (!rulesAccepted) {
      setError('You must review and agree to the Property Home Rules & Occupancy Policies before proceeding to payment.');
      return;
    }

    setLoading(true);

    try {
      // 1. Ensure Razorpay SDK script is loaded
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection and try again.');
      }

      // 2. Request backend to create a server-side verified Razorpay Order
      const payload = {
        property_id,
        room_id,
        check_in,
        check_out,
        total_guests: guests,
        adults,
        children,
        child_ages,
        cot_count,
        extra_bed_count,
        room_quantity,
        rules_accepted: true,
        experience_id: experience_id || undefined,
        experience_participants: experience_participants || undefined,
        customer_notes: customerNotes.trim() || undefined,
      };

      const orderData = await customerApi.createPaymentOrder(payload);

      // 3. Configure Razorpay Checkout Options
      const cleanContact = (orderData.customer_phone || user?.phone || '9999999999').replace(/[^0-9]/g, '') || '9999999999';

      const options = {
        key: orderData.key_id,
        amount: orderData.amount_paise,
        currency: orderData.currency || 'INR',
        name: 'Voyara Stays & Sanctuaries',
        description: `${property_name} • ${room_name} (${nights}N)`,
        order_id: orderData.order_id,
        prefill: {
          name: orderData.customer_name || user?.name || 'Voyara Guest',
          email: orderData.customer_email || user?.email || 'guest@voyara.com',
          contact: cleanContact,
        },
        notes: {
          booking_number: orderData.booking_number,
          property_name: property_name,
        },
        theme: {
          color: '#087F8C',
        },
        modal: {
          ondismiss: async () => {
            setLoading(false);
            setPaymentWarning('Payment window was closed before completion. You can retry anytime whenever you are ready.');
            try {
              await customerApi.recordPaymentFailure({
                booking_id: orderData.booking_id,
                razorpay_order_id: orderData.order_id,
                error_code: 'PAYMENT_CANCELLED_BY_USER',
                error_description: 'User dismissed Razorpay checkout window.',
              });
            } catch (err) {
              console.warn('Could not record cancellation status:', err);
            }
          },
        },
        handler: async (response) => {
          // 4. Payment succeeded on Razorpay modal -> Verify cryptographically on backend
          setVerifyingPayment(true);
          setLoading(true);
          try {
            const verifyPayload = {
              booking_id: orderData.booking_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            };

            const confirmedBooking = await customerApi.verifyPayment(verifyPayload);

            // 5. Navigate to confirmation page with verified booking & payment
            navigate(`/booking/confirmation/${confirmedBooking.id}`, {
              state: {
                booking: confirmedBooking,
                payment: response,
              },
            });
          } catch (verifyErr) {
            setError(verifyErr.message || 'Payment signature verification failed. Please contact Voyara support.');
          } finally {
            setVerifyingPayment(false);
            setLoading(false);
          }
        },
      };

      // 4. Open Razorpay Checkout Modal
      if (typeof window.Razorpay === 'undefined') {
        await loadRazorpayScript();
      }

      if (typeof window.Razorpay === 'undefined') {
        throw new Error('Razorpay payment gateway could not be initialized. Please refresh the page and try again.');
      }

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on('payment.failed', async function (failedResponse) {
        setLoading(false);
        const errDesc = failedResponse.error?.description || 'Transaction declined by bank or gateway.';
        setError(`Payment failed: ${errDesc}`);
        try {
          await customerApi.recordPaymentFailure({
            booking_id: orderData.booking_id,
            razorpay_order_id: orderData.order_id,
            error_code: failedResponse.error?.code || 'GATEWAY_DECLINE',
            error_description: errDesc,
          });
        } catch (recordErr) {
          console.warn('Could not record failure:', recordErr);
        }
      });

      razorpayInstance.open();
    } catch (err) {
      setError(err.message || 'Payment reservation initialization failed. Please check availability.');
      setLoading(false);
    }
  };

  const pRules = property_rules || {};
  const rRules = room_rules || {};

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#087F8C] dark:text-[#27B7A8] hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to stay details</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
              Step 2 of 2 • Secure Checkout
            </span>
            <VerificationBadge status="VERIFIED" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-serif text-[#17324D] dark:text-white">
            Review & Pay with Razorpay
          </h1>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center space-x-3 text-rose-700 dark:text-rose-300 text-xs font-bold animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Dismissal / Warning Alert */}
      {paymentWarning && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center space-x-3 text-amber-800 dark:text-amber-300 text-xs font-semibold animate-in fade-in">
          <Info className="w-5 h-5 shrink-0 text-amber-600" />
          <span>{paymentWarning}</span>
        </div>
      )}

      {/* Full-screen / inline verification overlay when confirming signature */}
      {verifyingPayment && (
        <div className="p-6 bg-[#DDF3E7] dark:bg-[#35A66F]/20 border border-[#35A66F]/40 rounded-3xl flex items-center space-x-4 animate-pulse">
          <div className="w-6 h-6 border-3 border-[#35A66F] border-t-transparent rounded-full animate-spin shrink-0"></div>
          <div>
            <h4 className="font-bold text-sm text-[#17324D] dark:text-[#35A66F]">
              Verifying Cryptographic Payment Signature...
            </h4>
            <p className="text-xs text-[#35A66F] dark:text-slate-300">
              Running VeriNova™ double-booking and transactional consistency checks. Please do not close your browser.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleRazorpayPayment} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Guest info, Notes, Rules Summary & Agreement */}
        <div className="lg:col-span-7 space-y-6">
          {/* Guest Identity Card */}
          <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-teal-900/40 shadow-sm space-y-4">
            <h2 className="text-base sm:text-lg font-bold font-serif text-[#17324D] dark:text-white flex items-center space-x-2">
              <Users className="w-5 h-5 text-[#087F8C]" />
              <span>Guest Information</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-[#FFFDF7] dark:bg-[#091B29] rounded-2xl border border-slate-100 dark:border-teal-900/40">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Primary Guest</span>
                <strong className="text-[#17324D] dark:text-white text-sm block">{user?.name || 'Voyara Traveler'}</strong>
              </div>

              <div className="p-3.5 bg-[#FFFDF7] dark:bg-[#091B29] rounded-2xl border border-slate-100 dark:border-teal-900/40">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Contact Phone</span>
                <strong className="text-[#17324D] dark:text-white text-sm block">{user?.phone || 'Verified'}</strong>
              </div>

              <div className="p-3.5 bg-[#FFFDF7] dark:bg-[#091B29] rounded-2xl border border-slate-100 dark:border-teal-900/40 sm:col-span-2">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Contact Email</span>
                <strong className="text-[#17324D] dark:text-white text-sm block">{user?.email}</strong>
              </div>
            </div>
          </div>

          {/* Applicable Home Rules & Occupancy Summary */}
          <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-teal-900/40 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base sm:text-lg font-bold font-serif text-[#17324D] dark:text-white flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-[#087F8C]" />
                <span>Applicable Property & Room Rules</span>
              </h2>
              <span className="text-[10px] font-bold uppercase text-[#087F8C] dark:text-[#27B7A8] bg-[#087F8C]/10 px-2.5 py-0.5 rounded-full">
                Review Required
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-100 dark:border-teal-900/40">
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">👶 Children Policy</span>
                <p className="text-[#607080] dark:text-slate-400 text-[11px]">
                  {pRules.children_allowed !== false
                    ? `Children welcome${pRules.min_child_age > 0 ? ` (Min age: ${pRules.min_child_age} yrs)` : ''}.`
                    : 'Adults only sanctuary.'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-100 dark:border-teal-900/40">
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">🐾 Pet Policy</span>
                <p className="text-[#607080] dark:text-slate-400 text-[11px]">
                  {pRules.pets_allowed ? `Pets allowed (${pRules.pet_types_allowed || 'Dogs & cats'}).` : 'No pets permitted.'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-100 dark:border-teal-900/40">
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">🚭 Smoking & Parties</span>
                <p className="text-[#607080] dark:text-slate-400 text-[11px]">
                  {pRules.smoking_allowed ? 'Smoking in designated zones.' : '100% Non-smoking.'} •{' '}
                  {pRules.parties_allowed ? 'Events allowed.' : 'No parties.'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-100 dark:border-teal-900/40">
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">🕒 Check-in / Quiet Hours</span>
                <p className="text-[#607080] dark:text-slate-400 text-[11px]">
                  Check-in: {pRules.check_in_time_start || '14:00'} - {pRules.check_in_time_end || '22:00'} • Quiet: {pRules.quiet_hours_start || '22:00'} - {pRules.quiet_hours_end || '07:00'}
                </p>
              </div>
            </div>

            {/* Mandatory Rules Acceptance Checkbox */}
            <div className="pt-2">
              <label className="flex items-start space-x-3 p-4 bg-[#FFF8F0] dark:bg-slate-900/80 rounded-2xl border-2 border-orange-200 dark:border-slate-700 cursor-pointer hover:border-[#F97316] transition-colors">
                <input
                  type="checkbox"
                  data-testid="rules-acceptance-checkbox"
                  checked={rulesAccepted}
                  onChange={(e) => setRulesAccepted(e.target.checked)}
                  className="w-5 h-5 rounded-md text-[#F97316] focus:ring-[#F97316] border-slate-300 dark:border-slate-600 shrink-0 mt-0.5 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 dark:text-white block">
                    I have read, understood, and agree to the Property Home Rules & Occupancy Policies
                  </span>
                  <p className="text-[11px] text-[#607080] dark:text-slate-400 mt-0.5">
                    I acknowledge child age limits, pet rules, quiet hours, and mandatory government ID verification upon arrival.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Special Requests */}
          <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-teal-900/40 shadow-sm space-y-3">
            <h2 className="text-base sm:text-lg font-bold font-serif text-[#17324D] dark:text-white">
              Special Requests / Stay Partner Notes
            </h2>
            <textarea
              rows={3}
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="e.g. Late check-in arrival around 6 PM, dietary preference for breakfast..."
              className="w-full px-4 py-3 rounded-2xl bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200 dark:border-slate-700 text-xs text-[#17324D] dark:text-white focus:outline-hidden focus:border-[#087F8C] focus:ring-2 focus:ring-[#087F8C]/20 resize-none"
            />
          </div>

          {/* Razorpay Trust & Payment Methods Banner */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-[#17324D] via-[#087F8C]/90 to-[#091B29] text-white border border-teal-500/30 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-white/20 text-[#27B7A8] flex items-center justify-center font-bold text-xs border border-white/20">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Razorpay 256-Bit Encrypted Payment</h4>
                  <p className="text-[10px] text-slate-200">UPI, Credit/Debit Cards, NetBanking, Wallets supported</p>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#DDF3E7] text-[#35A66F] font-bold">
                100% Safe
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1 text-[10px] font-semibold text-slate-200">
              <span className="px-2.5 py-1 bg-white/10 rounded-lg border border-white/10">⚡ Google Pay / PhonePe / Paytm</span>
              <span className="px-2.5 py-1 bg-white/10 rounded-lg border border-white/10">💳 Visa / Mastercard / RuPay</span>
              <span className="px-2.5 py-1 bg-white/10 rounded-lg border border-white/10">🏦 Net Banking (50+ Banks)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Reservation Breakdown */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-teal-900/40 shadow-xl space-y-6">
            <h2 className="text-base sm:text-lg font-bold font-serif text-[#17324D] dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Reservation Summary
            </h2>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#FFFDF7] dark:bg-[#091B29] rounded-2xl border border-slate-100 dark:border-teal-900/40 space-y-1">
                <span className="text-[10px] font-bold uppercase text-[#087F8C] dark:text-[#27B7A8]">{property_type}</span>
                <h4 className="text-sm font-bold text-[#17324D] dark:text-white">{property_name}</h4>
                <p className="text-[#607080] dark:text-slate-400">{property_city} • {room_name}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-semibold text-[#607080] dark:text-slate-300">
                  <span>🏢 {room_quantity} {room_quantity === 1 ? 'Room' : 'Rooms'}</span>
                  <span>•</span>
                  <span>👥 {adults} Adult(s){children > 0 ? `, ${children} Child(ren)` : ''}</span>
                  {cot_count > 0 && <span>• 🛏 {cot_count} Cot(s)</span>}
                  {extra_bed_count > 0 && <span>• 🛏 {extra_bed_count} Extra Bed(s)</span>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-[#FFFDF7] dark:bg-[#091B29] rounded-xl border border-slate-100 dark:border-teal-900/40">
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Check-in</span>
                  <strong className="text-[#17324D] dark:text-white">{check_in}</strong>
                </div>
                <div className="p-3 bg-[#FFFDF7] dark:bg-[#091B29] rounded-xl border border-slate-100 dark:border-teal-900/40">
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Check-out</span>
                  <strong className="text-[#17324D] dark:text-white">{check_out}</strong>
                </div>
              </div>

              {experience_title && (
                <div className="p-3 bg-[#DDF3E7] dark:bg-[#35A66F]/20 rounded-xl border border-[#35A66F]/30 space-y-0.5">
                  <span className="text-[10px] font-bold uppercase text-[#35A66F]">Bundled Experience</span>
                  <h5 className="font-bold text-[#17324D] dark:text-emerald-300">{experience_title}</h5>
                  <p className="text-[11px] text-[#35A66F]">{experience_participants} participant(s)</p>
                </div>
              )}
            </div>

            {/* Price Calculations */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-[#607080] dark:text-slate-300">
                <span>{room_name} (₹{room_price?.toLocaleString('en-IN')} × {nights}n × {room_quantity}r)</span>
                <span className="font-bold text-[#17324D] dark:text-white">₹{room_subtotal.toLocaleString('en-IN')}</span>
              </div>

              {cots_subtotal > 0 && (
                <div className="flex justify-between text-[#087F8C] dark:text-[#27B7A8]">
                  <span>Baby Cot ({cot_count} unit × {nights}n)</span>
                  <span className="font-bold">₹{cots_subtotal.toLocaleString('en-IN')}</span>
                </div>
              )}

              {extra_beds_subtotal > 0 && (
                <div className="flex justify-between text-[#087F8C] dark:text-[#27B7A8]">
                  <span>Extra Bed ({extra_bed_count} unit × {nights}n)</span>
                  <span className="font-bold">₹{extra_beds_subtotal.toLocaleString('en-IN')}</span>
                </div>
              )}

              {children_subtotal > 0 && (
                <div className="flex justify-between text-[#087F8C] dark:text-[#27B7A8]">
                  <span>Child supplement ({children} child × {nights}n)</span>
                  <span className="font-bold">₹{children_subtotal.toLocaleString('en-IN')}</span>
                </div>
              )}

              {experience_title && (
                <div className="flex justify-between text-[#087F8C] dark:text-[#27B7A8]">
                  <span>Experience Add-on</span>
                  <span className="font-bold">₹{experience_subtotal.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between text-sm font-bold text-[#17324D] dark:text-white">
                <div>
                  <span>Total Amount Due</span>
                  <span className="text-[10px] text-[#35A66F] block font-semibold">Includes All Taxes & VeriNova Audit</span>
                </div>
                <span className="text-xl text-[#F97316] font-serif font-black">₹{total_amount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Payment Button */}
            <button
              type="submit"
              disabled={loading || verifyingPayment || !rulesAccepted}
              className="w-full py-4 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-bold rounded-2xl shadow-lg shadow-[#F97316]/25 hover:shadow-xl transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer disabled:opacity-50"
            >
              {loading || verifyingPayment ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{verifyingPayment ? 'Verifying Transaction...' : 'Opening Razorpay Gateway...'}</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Pay ₹{total_amount.toLocaleString('en-IN')} with Razorpay</span>
                </>
              )}
            </button>

            <div className="text-center">
              <span className="text-[10px] text-slate-400 flex items-center justify-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#35A66F]" />
                <span>Protected by VeriNova™ Transaction Verification</span>
              </span>
            </div>
          </div>
        </div>
      </form>

      {/* Voyara AI Floating Assistant */}
      <VoyaraAIChat
        propertyId={property_id}
        propertyName={property_name}
        selectedRoomId={room_id}
        selectedRoomName={room_name}
        checkIn={check_in}
        checkOut={check_out}
        requestedRooms={room_quantity}
        adults={adults}
        childrenCount={children}
        childAges={child_ages}
        cotRequested={cot_count > 0}
        extraBedRequested={extra_bed_count > 0}
      />
    </div>
  );
};

export default BookingPage;
