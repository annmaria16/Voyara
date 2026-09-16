import React, { useState, useEffect } from 'react';
import { customerApi } from '../../api/customer';
import {
  X,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Clock,
  ArrowRight,
  Info,
  Calendar,
  CreditCard,
  Sparkles,
} from 'lucide-react';

export const CancellationModal = ({ booking, isOpen, onClose, onSuccess }) => {
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (isOpen && booking) {
      setReason('');
      setError('');
      setResult(null);
      fetchPreview();
    }
  }, [isOpen, booking]);

  const fetchPreview = async () => {
    setLoadingPreview(true);
    setError('');
    try {
      const data = await customerApi.getCancellationPreview(booking.id);
      setPreview(data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load cancellation preview.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmCancel = async () => {
    setCancelling(true);
    setError('');
    try {
      const res = await customerApi.cancelBooking(booking.id, {
        reason: reason.trim() || 'Guest requested cancellation',
      });
      setResult(res);
      if (onSuccess) onSuccess(res);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to cancel reservation.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div data-testid="cancellation-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-[#0F273D] border border-slate-200 dark:border-teal-900/50 rounded-3xl w-full max-w-lg p-6 sm:p-8 space-y-6 shadow-2xl my-auto animate-fadeIn text-[#17324D] dark:text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Cancel Reservation</span>
            </div>
            <h3 className="text-lg font-black font-serif text-[#17324D] dark:text-white mt-0.5">
              Confirm Cancellation & Refund
            </h3>
            <p className="text-xs text-[#607080] dark:text-slate-400 truncate max-w-sm">
              Booking #{booking.booking_number} • {booking.property?.name || 'Sanctuary'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Screen */}
        {result ? (
          <div data-testid="cancellation-success-screen" className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xl font-bold font-serif text-[#17324D] dark:text-white">
                Reservation Cancelled
              </h4>
              <p className="text-xs text-[#607080] dark:text-slate-300">
                Your cancellation has been verified and registered with VeriNova.
              </p>
            </div>

            {result.refund && (
              <div className="p-4 bg-[#FFFDF7] dark:bg-[#091B29] border border-emerald-500/30 rounded-2xl text-left space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Refund Reference</span>
                  <span className="font-mono font-bold text-[#087F8C] dark:text-[#27B7A8]">
                    {result.refund.refund_reference}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#607080] dark:text-slate-400">Refund Rate Applied:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                    {result.refund.refund_percentage}%
                  </strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#607080] dark:text-slate-400">Estimated Refund to Traveler:</span>
                  <strong data-testid="cancel-success-refund-amount" className="text-lg font-serif font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{result.refund.refund_amount?.toLocaleString('en-IN')}
                  </strong>
                </div>
                {(result.refund.retained_amount > 0 || result.refund.cancellation_fee > 0) && (
                  <div className="flex justify-between items-center text-[11px] text-slate-400">
                    <span>Retained Amount:</span>
                    <span>₹{(result.refund.retained_amount || result.refund.cancellation_fee)?.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="pt-1 text-[10px] text-slate-400 italic">
                  * Internal Settlement / Demo Refund mode active.
                </div>
              </div>
            )}

            <button
              type="button"
              data-testid="cancellation-done-btn"
              onClick={onClose}
              className="w-full py-3 bg-[#087F8C] hover:bg-[#066570] text-white font-bold rounded-2xl text-xs shadow-md transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : loadingPreview ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#087F8C] animate-spin" />
            <p className="text-xs text-[#607080] dark:text-slate-300 font-medium">
              Calculating authoritative cancellation policy & refund breakdown...
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {preview && !preview.can_cancel && (
              <div data-testid="cancellation-not-allowed-box" className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-amber-800 dark:text-amber-300 text-xs font-semibold space-y-1">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <strong>Cancellation is No Longer Available</strong>
                </div>
                <p className="text-[11px] font-normal leading-relaxed">
                  {preview.reason || "Cancellation is no longer available because the 6:00 AM check-in deadline has passed."}
                </p>
              </div>
            )}

            {preview && preview.can_cancel && (
              <>
                {/* Policy Banner */}
                <div
                  className={`p-4 rounded-2xl border space-y-1.5 ${
                    preview.is_free_cancellation
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                      : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  <div className="flex items-center space-x-2 font-bold text-xs">
                    {preview.is_free_cancellation ? (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>100% Free Cancellation Tier Active</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>Standard Stay Partner Cancellation Policy Active</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    {preview.policy_description}
                  </p>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-1 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Hard cutoff: <strong data-testid="cancel-preview-deadline">{preview.cancellation_deadline_str || '6:00 AM on check-in date'}</strong></span>
                  </div>
                </div>

                {/* Live Refund Breakdown Table */}
                <div className="p-4 bg-[#FFFDF7] dark:bg-[#091B29] rounded-2xl border border-slate-100 dark:border-teal-900/40 space-y-3 text-xs">
                  <span className="text-slate-400 dark:text-slate-400 font-bold block uppercase tracking-wider text-[10px]">
                    Authoritative Backend Refund Calculation
                  </span>
                  
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-[#607080] dark:text-slate-300">
                      <span>Booking Amount:</span>
                      <span data-testid="cancel-preview-booking-amount" className="font-semibold text-[#17324D] dark:text-white">
                        ₹{(preview.original_total_amount || preview.booking_amount)?.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[#607080] dark:text-slate-300">
                      <span>Cancellation Policy:</span>
                      <span className="font-bold text-[#087F8C] dark:text-[#27B7A8]">
                        {preview.refund_percentage}% refund
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[#607080] dark:text-slate-300">
                      <span>Amount Retained:</span>
                      <span data-testid="cancel-preview-retained-amount" className="font-semibold text-slate-700 dark:text-slate-300">
                        ₹{preview.retained_amount?.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm">
                      <span className="font-bold text-[#17324D] dark:text-white">Estimated Refund:</span>
                      <strong data-testid="cancel-preview-refund-amount" className="text-lg font-serif font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{preview.refund_amount?.toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Reason Textarea */}
                <div>
                  <label className="block text-xs font-bold text-[#17324D] dark:text-slate-200 mb-1">
                    Reason for Cancellation (Optional)
                  </label>
                  <textarea
                    rows={2}
                    data-testid="cancellation-reason-input"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="E.g., Change of travel plans, emergency, rescheduling..."
                    className="w-full p-3 bg-white dark:bg-[#091B29] border border-slate-200 dark:border-teal-900/50 rounded-2xl text-xs text-[#17324D] dark:text-white focus:outline-hidden focus:border-rose-500"
                  />
                </div>

                {/* VeriNova Security Notice */}
                <div className="flex items-start space-x-2 text-[11px] text-[#607080] dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <ShieldCheck className="w-4 h-4 text-[#087F8C] dark:text-[#27B7A8] shrink-0 mt-0.5" />
                  <span>
                    Internal Settlement Mode: Upon confirmation, room units are restored to live inventory and a VeriNova audit record (<code>VN-REF-XXXXXXXX</code>) is created.
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    data-testid="keep-booking-btn"
                    onClick={onClose}
                    disabled={cancelling}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#17324D] dark:text-slate-300 font-bold rounded-2xl text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Keep Booking
                  </button>

                  <button
                    type="button"
                    data-testid="confirm-cancellation-btn"
                    onClick={handleConfirmCancel}
                    disabled={cancelling}
                    className="flex-1 py-3 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-bold rounded-2xl text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-1.5"
                  >
                    {cancelling ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing Cancellation...</span>
                      </>
                    ) : (
                      <>
                        <span>Confirm Cancellation</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CancellationModal;
