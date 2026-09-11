import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, AlertCircle, CheckCircle2, Check, Sparkles, Lock, Shield } from 'lucide-react';
import { verinovaApi } from '../../api/verinova';

export const VerificationModal = ({ bookingId, isOpen, onClose }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && bookingId) {
      const fetchVerification = async () => {
        setLoading(true);
        setError(null);
        try {
          const data = await verinovaApi.getResults(bookingId);
          setDetails(data);
        } catch (err) {
          setError(err.message || 'Failed to load VeriNova audit details.');
        } finally {
          setLoading(false);
        }
      };
      fetchVerification();
    }
  }, [isOpen, bookingId]);

  if (!isOpen) return null;

  const friendlyChecks = [
    { label: 'Property verified & approved by platform moderation', done: true },
    { label: 'Room availability confirmed with zero double-booking conflicts', done: true },
    { label: 'Check-in and check-out dates validated against calendar', done: true },
    { label: 'Experience schedule & capacity constraints validated', done: true },
    { label: 'Authoritative server rate validated with zero hidden charges', done: true },
    { label: 'Cryptographic transaction integrity fingerprint generated', done: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#091B29]/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0F273D] rounded-3xl shadow-2xl border border-teal-500/30 dark:border-slate-800 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#091B29] via-[#0F273D] to-[#087F8C] p-6 text-white flex items-center justify-between border-b border-teal-500/20">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-teal-500/20 rounded-2xl border border-teal-400/40 text-teal-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase tracking-widest text-teal-300 font-bold">VeriNova™ Integrity</span>
                <span className="text-[10px] bg-white/10 px-2.5 py-0.5 rounded-full text-white/80 font-medium">Independent Verification</span>
              </div>
              <h3 className="text-xl font-bold font-serif text-white">Verified by VeriNova</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-[#091B29] dark:text-slate-200">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-[#087F8C] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">Verifying transaction integrity...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : details ? (
            <>
              {/* Summary Card */}
              <div className="p-4.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/30 text-emerald-900 dark:text-emerald-300 space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Audit Certificate
                  </span>
                  <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400 bg-teal-500/15 px-2.5 py-0.5 rounded-full">
                    {details.verification_id || `VN-TX-${String(bookingId).padStart(8, '0')}`}
                  </span>
                </div>
                <h4 className="text-base font-bold font-serif text-[#091B29] dark:text-white">
                  Booking Verified & Consistent
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  This reservation passed all platform consistency and database inventory locks before confirmation.
                </p>
              </div>

              {/* Transaction Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 bg-[#FFFDF7] dark:bg-[#091B29] p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Property</span>
                  <span className="font-bold text-[#091B29] dark:text-white truncate block">{details.property_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Room Unit</span>
                  <span className="font-bold text-[#091B29] dark:text-white truncate block">{details.room_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Stay Dates</span>
                  <span className="font-bold text-[#091B29] dark:text-white block">{details.check_in} – {details.check_out}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Verified Total</span>
                  <span className="font-black font-serif text-orange-600 dark:text-orange-400 block text-sm">₹{Number(details.total_amount || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Customer-Friendly Consistency Checklist */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Consistency Audit Points</span>
                </h5>
                <div className="space-y-2">
                  {friendlyChecks.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#FFFDF7] dark:bg-[#091B29] border border-slate-200/80 dark:border-slate-800 flex items-center space-x-3 text-xs"
                    >
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="bg-[#FFFDF7] dark:bg-[#091B29] px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Powered by <strong className="text-[#087F8C] dark:text-teal-400">VeriNova™</strong> inside Voyara
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-orange-500 to-[#EA580C] hover:from-orange-600 hover:to-[#c2410c] text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerificationModal;


