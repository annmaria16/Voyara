import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, AlertCircle, CheckCircle2, AlertTriangle, XCircle, FileText } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#131D2E] rounded-2xl shadow-2xl border border-emerald-500/30 dark:border-slate-800 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-[#131D2E] p-6 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-500/40 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">VeriNova Layer</span>
                <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-white/80">Voyara Trust Engine</span>
              </div>
              <h3 className="text-xl font-bold font-serif text-white">Transaction Consistency Audit</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-200">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">Validating transaction against PostgreSQL inventory...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-300 text-sm flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : details ? (
            <>
              {/* Summary Card */}
              <div className={`p-4 rounded-xl border ${
                details.verification_status === 'VERIFIED'
                  ? 'bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-500/40 text-emerald-900 dark:text-emerald-300'
                  : details.verification_status === 'NEEDS_REVIEW'
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-300'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50 text-rose-900 dark:text-rose-300'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider opacity-75">Status Determination</span>
                    <h4 className="text-lg font-bold mt-0.5">{details.verification_status}</h4>
                  </div>
                  <span className="text-xs bg-white/80 dark:bg-slate-800 px-2.5 py-1 rounded-full font-mono border border-black/5 dark:border-slate-700 text-slate-800 dark:text-white">
                    Booking #{details.booking_number}
                  </span>
                </div>
                <p className="text-sm mt-2 leading-relaxed opacity-90">{details.summary}</p>
              </div>

              {/* Transaction Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FFF8F0] dark:bg-slate-900/80 p-4 rounded-xl border border-[#FDBA9A]/30 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Stay Property</span>
                  <span className="font-semibold text-slate-900 dark:text-white truncate block">{details.property_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Room Unit</span>
                  <span className="font-semibold text-slate-900 dark:text-white truncate block">{details.room_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Dates</span>
                  <span className="font-semibold text-slate-900 dark:text-white block">{details.check_in} – {details.check_out}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Verified Total</span>
                  <span className="font-bold text-orange-600 dark:text-orange-400 block">₹{details.total_amount?.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Checks Checklist */}
              <div>
                <h5 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <span>Itemized Consistency Verification ({details.checks?.length || 0} Checks)</span>
                </h5>
                <div className="space-y-2.5">
                  {details.checks?.map((chk, idx) => (
                    <div
                      key={chk.id || idx}
                      className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-emerald-500/40 transition-colors flex items-start space-x-3 shadow-2xs"
                    >
                      <div className="mt-0.5 shrink-0">
                        {chk.status === 'PASS' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : chk.status === 'WARNING' ? (
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{chk.check_name}</span>
                          <span className="text-[10px] font-mono uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            {chk.check_category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{chk.message}</p>
                        {chk.details && (
                          <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1 bg-slate-50 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 inline-block">
                            {chk.details}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="bg-[#FFF8F0] dark:bg-slate-900/90 px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Powered by <strong className="text-emerald-600 dark:text-emerald-400">VeriNova</strong> inside Voyara
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-[#F97360] to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-sm font-semibold shadow-md transition-all cursor-pointer"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};
