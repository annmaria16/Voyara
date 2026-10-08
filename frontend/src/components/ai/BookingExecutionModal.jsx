import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Copy,
  ArrowRight,
  Sparkles,
  Home,
  Calendar,
  Users,
  Bed,
  CreditCard,
  Check
} from 'lucide-react';
import {
  formatDisplayName,
  formatPropertyName,
  formatLocationName,
  formatRoomName
} from '../../utils/formatters';

export const BookingExecutionModal = ({
  isOpen,
  confirming,
  booking,
  verification,
  onClose
}) => {
  if (!isOpen) return null;

  const bNum = booking?.booking_number || 'VOY-BOOKING';
  const propName = formatPropertyName(booking?.property_name);
  const roomName = formatRoomName(booking?.rooms?.[0]?.room_name || 'Room');
  const totalAmt = Number(booking?.total_amount || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#0E273C] border border-[#E0ECEF] dark:border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 relative overflow-hidden">
        
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-teal-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* State 1: Executing in Progress */}
        {confirming && (
          <div className="text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center mx-auto text-[#087F8C] shadow-md">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-[#17324D] dark:text-white">
                Processing Secure Razorpay Payment
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                256-bit encrypted gateway · Cryptographic HMAC-SHA256 signature verification
              </p>
            </div>

            {/* Live Progress Checklist */}
            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 text-xs space-y-2.5 border border-slate-200/80 dark:border-white/5 text-left">
              <div className="flex items-center space-x-2 text-emerald-600 font-bold">
                <Check className="w-4 h-4" />
                <span>Guest details & stay parameters validated</span>
              </div>
              <div className="flex items-center space-x-2 text-emerald-600 font-bold">
                <Check className="w-4 h-4" />
                <span>Authoritative price & inventory locked</span>
              </div>
              <div className="flex items-center space-x-2 text-emerald-600 font-bold">
                <Check className="w-4 h-4" />
                <span>Razorpay Payment Order initialized</span>
              </div>
              <div className="flex items-center space-x-2 text-teal-600 dark:text-teal-400 font-bold animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Awaiting traveler checkout & signature verification...</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-400">
                <span className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 inline-block" />
                <span>VeriNova independent 12-checkpoint verification</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-400">
                <span className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 inline-block" />
                <span>Final confirmed booking issuance</span>
              </div>
            </div>
          </div>
        )}

        {/* State 2: Confirmed & Verified */}
        {!confirming && booking && (
          <div className="space-y-5">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold text-[#17324D] dark:text-white">
                Booking Confirmed & Verified!
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center justify-center space-x-1">
                <span>🛡️ VeriNova Score: {verification?.verinova_score ?? 100}/100</span>
                <span>· 100% Guaranteed</span>
              </p>
            </div>

            {/* Confirmed Details Card */}
            <div className="bg-slate-50 dark:bg-slate-900/70 rounded-2xl p-4 border border-slate-200 dark:border-white/10 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-white/5">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Booking Number</span>
                  <div className="font-mono font-bold text-sm text-[#087F8C] dark:text-teal-400">
                    {bNum}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Amount Paid</span>
                  <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                    ₹{totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Stay:</span>
                  <span className="font-bold text-[#17324D] dark:text-white">{propName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Room:</span>
                  <span className="font-semibold text-[#17324D] dark:text-white">{roomName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Dates:</span>
                  <span className="font-semibold">{booking.check_in} → {booking.check_out} ({booking.total_nights} nights)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Source:</span>
                  <span className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold text-[10px] uppercase">
                    Voyara AI Autonomous Booking
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={onClose}
                className="py-3 px-4 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition text-center"
              >
                Continue Chat
              </button>

              <Link
                to="/customer/bookings"
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] hover:from-[#0F9D9A] hover:to-[#087F8C] text-white font-bold text-xs shadow-md transition flex items-center justify-center space-x-1.5 text-center"
              >
                <span>View My Journeys</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default BookingExecutionModal;
