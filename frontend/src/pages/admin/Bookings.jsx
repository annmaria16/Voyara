import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { VerificationBadge } from '../../components/verification/VerificationBadge';
import { VerificationModal } from '../../components/verification/VerificationModal';
import { InvoiceModal } from '../../components/payment/InvoiceModal';
import {
  BookOpen,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  FileText,
  Calendar,
  Users,
  Search,
  Filter,
} from 'lucide-react';

export const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [invoiceBooking, setInvoiceBooking] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const data = await adminApi.getBookings();
        setBookings(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || 'Failed to load bookings.');
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const filteredBookings = bookings.filter((b) => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      b.status === statusFilter;

    const matchesSearch =
      !searchQuery.trim() ||
      b.booking_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.property?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const totalGross = bookings
    .reduce((acc, curr) => acc + (curr.original_total_amount || curr.total_amount || 0), 0);

  const totalRefunded = bookings
    .reduce((acc, curr) => acc + (curr.refund_amount || 0), 0);

  const totalFinalizedCommission = bookings
    .filter((b) => b.commission_status === 'FINALIZED')
    .reduce((acc, curr) => acc + (curr.commission_amount || 0), 0);

  const totalFinalizedSettlements = bookings
    .filter((b) => b.commission_status === 'FINALIZED')
    .reduce((acc, curr) => acc + (curr.provider_settlement_amount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#091B29] dark:text-white tracking-tight">
            Bookings & Settlement Monitor
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time reservation ledger, 10% platform commission accounting, Stay Partner 90% settlements, and VeriNova audit trail.
          </p>
        </div>
      </div>

      {/* 4 Platform Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div data-testid="admin-gross-volume" className="p-5 bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Gross Booking Volume</span>
          <span className="text-xl font-serif font-black text-orange-500 block">
            ₹{totalGross.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Across {bookings.length} total reservations</span>
        </div>

        <div data-testid="admin-finalized-commission" className="p-5 bg-white dark:bg-[#0F273D] border border-emerald-500/30 dark:border-emerald-500/20 rounded-2xl shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block tracking-wider">Voyara Commission (10%)</span>
          <span className="text-xl font-serif font-black text-emerald-600 dark:text-emerald-400 block">
            ₹{totalFinalizedCommission.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Finalized upon check-in & cancellation</span>
        </div>

        <div data-testid="admin-finalized-settlements" className="p-5 bg-white dark:bg-[#0F273D] border border-[#087F8C]/30 dark:border-[#087F8C]/20 rounded-2xl shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-[#087F8C] dark:text-[#27B7A8] block tracking-wider">Partner Settlements (90%)</span>
          <span className="text-xl font-serif font-black text-[#087F8C] dark:text-[#27B7A8] block">
            ₹{totalFinalizedSettlements.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Finalized for stay partners</span>
        </div>

        <div data-testid="admin-refunded-volume" className="p-5 bg-white dark:bg-[#0F273D] border border-rose-500/30 dark:border-rose-500/20 rounded-2xl shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block tracking-wider">Customer Refunds</span>
          <span className="text-xl font-serif font-black text-rose-600 dark:text-rose-400 block">
            ₹{totalRefunded.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Returned to guest source accounts</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 custom-scrollbar">
          {['ALL', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${statusFilter === s
                ? 'bg-gradient-to-r from-[#087F8C] to-[#0F9D9A] text-white shadow-md shadow-teal-900/20'
                : 'bg-white dark:bg-[#0F273D] text-slate-700 dark:text-slate-300 hover:bg-[#FFFDF7] dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
                }`}
            >
              {s === 'ALL' ? 'All Bookings' : s.replace(/_/g, ' ')} ({bookings.filter((b) => s === 'ALL' || b.status === s).length})
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search booking #, guest, stay..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#0F273D] border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs text-[#091B29] dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-[#087F8C]"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="w-8 h-8 border-3 border-[#087F8C] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-16 text-center border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-xs">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-lg font-serif font-bold text-[#091B29] dark:text-white">No bookings matched</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Try adjusting the filter or search query.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0F273D] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3">Reference</th>
                  <th className="pb-3">Customer & Stay</th>
                  <th className="pb-3">Dates</th>
                  <th className="pb-3">Gross Total</th>
                  <th className="pb-3">Refund / Retained</th>
                  <th className="pb-3">Voyara Fee (10%)</th>
                  <th className="pb-3">Partner Share (90%)</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">VeriNova</th>
                  <th className="pb-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredBookings.map((b) => {
                  const origAmount = b.original_total_amount || b.total_amount || 0;
                  const isCancelled = b.status === 'CANCELLED';
                  const isCheckedIn = b.status === 'CHECKED_IN';
                  const isCompleted = b.status === 'COMPLETED';
                  const isFinalized = b.commission_status === 'FINALIZED';

                  return (
                    <tr key={b.id} data-testid={`admin-booking-row-${b.id}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 font-mono font-bold text-[#087F8C] dark:text-[#27B7A8]">
                        {b.booking_number || `VOY-${b.id}`}
                      </td>
                      <td className="py-4">
                        <strong className="text-[#091B29] dark:text-white block">{b.user?.name || 'Customer'}</strong>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] block">{b.property?.name}</span>
                        <span className="text-slate-400 dark:text-slate-500 text-[10px] block">{b.user?.email}</span>
                      </td>
                      <td className="py-4 text-slate-600 dark:text-slate-300">
                        <div>{b.check_in} ➔ {b.check_out}</div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">{b.total_nights || 1} Night(s)</span>
                      </td>
                      <td className="py-4 font-serif font-black text-orange-500 text-sm">
                        ₹{origAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-4">
                        {isCancelled ? (
                          <div className="space-y-0.5 text-[11px]">
                            <div className="text-rose-600 dark:text-rose-400 font-semibold">
                              Refund: ₹{(b.refund_amount || 0).toLocaleString('en-IN')}
                            </div>
                            <div className="text-slate-600 dark:text-slate-300">
                              Retained: ₹{(b.retained_amount || 0).toLocaleString('en-IN')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">₹0 refunded</span>
                        )}
                      </td>
                      <td className="py-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 dark:text-white block">
                            ₹{(b.commission_amount || (isFinalized ? 0 : Math.round(origAmount * 0.10))).toLocaleString('en-IN')}
                          </span>
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${isFinalized
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            }`}>
                            {b.commission_status || 'NOT_FINALIZED'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 block">
                            ₹{(b.provider_settlement_amount || (isFinalized ? 0 : Math.round(origAmount * 0.90))).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[9px] text-slate-400 block font-mono">
                            {b.payout_status || 'PENDING_CHECKIN'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${isCancelled
                          ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                          : isCheckedIn
                            ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30'
                            : isCompleted
                              ? 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30'
                              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                          }`}>
                          {b.status === 'CHECKED_IN' ? 'CHECKED IN' : b.status}
                        </span>
                      </td>
                      <td className="py-4">
                        <VerificationBadge
                          status={isCancelled ? 'NEEDS_REVIEW' : 'VERIFIED'}
                          size="sm"
                          onClick={() => setSelectedBookingId(b.id)}
                          showDetailsHint={true}
                        />
                      </td>
                      <td className="py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setInvoiceBooking(b)}
                          className="px-3 py-1.5 bg-[#FFFDF7] dark:bg-slate-800 hover:bg-[#087F8C]/10 dark:hover:bg-slate-700 text-[#087F8C] dark:text-[#27B7A8] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all inline-flex items-center space-x-1 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Receipt</span>
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

      {invoiceBooking && (
        <InvoiceModal
          booking={invoiceBooking}
          isOpen={!!invoiceBooking}
          onClose={() => setInvoiceBooking(null)}
        />
      )}
    </div>
  );
};

export default AdminBookings;
