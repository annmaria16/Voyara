import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { VerificationBadge } from '../../components/verification/VerificationBadge';
import { VerificationModal } from '../../components/verification/VerificationModal';
import { ShieldCheck, Filter, AlertCircle, Calendar, Users, Home, CheckCircle2, AlertTriangle, XCircle, Search } from 'lucide-react';

export const VerificationCenter = () => {
  const [records, setRecords] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [error, setError] = useState('');

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getVerificationRecords(statusFilter === 'ALL' ? undefined : statusFilter);
      setRecords(data);
    } catch (err) {
      setError(err.message || 'Failed to load verification audits.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [statusFilter]);

  const filteredRecords = records.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.booking_number?.toLowerCase().includes(term) ||
      r.customer_name?.toLowerCase().includes(term) ||
      r.property_name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] border border-slate-800 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-500/40 text-emerald-400 shrink-0">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">VeriNova Engine</span>
              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-slate-200">Audit Center</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-serif text-white">Admin Verification Center</h2>
            <p className="text-xs text-slate-300 mt-1">
              Inspect multi-point database consistency checks, availability conflicts, and price calculations across all bookings.
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#131D2E] rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          {['ALL', 'VERIFIED', 'NEEDS_REVIEW', 'FAILED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-gradient-to-r from-[#F97360] to-orange-500 text-white shadow-xs'
                  : 'bg-[#FFF8F0] dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-orange-500/10 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
              }`}
            >
              {st === 'ALL' ? 'All Audits' : st}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search booking #, guest, stay..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#FFF8F0]/60 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:border-[#F97360]"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Audit Records Table */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Loading VeriNova audit records...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-16 text-center border border-slate-200/80 dark:border-slate-800 space-y-3">
          <ShieldCheck className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-[#102A43] dark:text-white">No verification records match your filters</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Try selecting "All Audits" or adjusting search term.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#131D2E] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3">Reference</th>
                  <th className="pb-3">Guest</th>
                  <th className="pb-3">Stay & Unit</th>
                  <th className="pb-3">Dates</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">VeriNova Status</th>
                  <th className="pb-3">Checks Passed</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRecords.map((r) => {
                  const passedChecks = r.checks?.filter((c) => c.status === 'PASS').length || 0;
                  const totalChecks = r.checks?.length || 0;

                  return (
                    <tr key={r.booking_id} className="hover:bg-[#FFF8F0]/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 font-mono font-bold text-[#102A43] dark:text-white">{r.booking_number}</td>
                      <td className="py-4">
                        <strong className="text-[#102A43] dark:text-white block">{r.customer_name}</strong>
                        <span className="text-slate-400 dark:text-slate-500 text-[11px]">{r.customer_email}</span>
                      </td>
                      <td className="py-4">
                        <strong className="text-[#102A43] dark:text-white block">{r.property_name}</strong>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">{r.room_name}</span>
                        {r.experience_title && (
                          <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold block">
                            + {r.experience_title}
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-slate-600 dark:text-slate-300">
                        {r.check_in} to {r.check_out}
                      </td>
                      <td className="py-4 font-bold text-[#F97360] font-serif text-sm">
                        ₹{r.total_amount?.toLocaleString('en-IN')}
                      </td>
                      <td className="py-4">
                        <VerificationBadge
                          status={r.verification_status}
                          size="sm"
                          onClick={() => setSelectedBookingId(r.booking_id)}
                        />
                      </td>
                      <td className="py-4">
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 dark:bg-emerald-500/20 px-2.5 py-0.5 rounded-full font-mono border border-emerald-500/30">
                          {passedChecks} / {totalChecks} Pass
                        </span>
                      </td>
                      <td className="py-4">
                        <button
                          onClick={() => setSelectedBookingId(r.booking_id)}
                          className="px-3 py-1 bg-gradient-to-r from-[#F97360] to-orange-500 text-white text-xs font-bold rounded-xl hover:from-[#e05e4b] hover:to-orange-600 transition-all cursor-pointer shadow-xs"
                        >
                          Deep Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
